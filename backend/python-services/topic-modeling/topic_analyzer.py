"""
TopicAnalyzer - Analyse de topics avec BERTopic

Utilise BERTopic pour identifier les thèmes principaux dans un corpus de documents
à partir d'embeddings pré-calculés (depuis Ollama).

Architecture :
1. UMAP pour réduction dimensionnelle (768 -> 5 dimensions)
2. HDBSCAN pour clustering
3. c-TF-IDF pour extraction de mots-clés
"""

from typing import List, Dict, Any, Optional
import numpy as np
from bertopic import BERTopic
from sklearn.feature_extraction.text import CountVectorizer


class TopicAnalyzer:
    """Analyseur de topics avec BERTopic optimisé pour CPU"""

    def __init__(
        self,
        min_topic_size: int = 5,
        language: str = "multilingual",
        n_gram_range: tuple = (1, 3),
    ):
        """
        Initialise le TopicAnalyzer

        Args:
            min_topic_size: Taille minimale d'un topic (défaut: 5 documents)
            language: Langue pour les stop words ("french", "english", "multilingual")
            n_gram_range: Plage de n-grammes pour extraction de mots-clés (défaut: 1-3)
        """
        self.min_topic_size = min_topic_size
        self.language = language
        self.n_gram_range = n_gram_range

        # Initialiser le vectorizer pour c-TF-IDF
        # Supporte français et anglais avec stop words
        stop_words = self._get_stop_words(language)
        self.vectorizer = CountVectorizer(
            ngram_range=n_gram_range,
            stop_words=stop_words,
            min_df=1,  # Minimum document frequency
        )

        # Initialiser BERTopic avec paramètres optimisés pour CPU
        self.model = BERTopic(
            embedding_model=None,  # On fournira les embeddings pré-calculés
            vectorizer_model=self.vectorizer,
            min_topic_size=min_topic_size,
            nr_topics="auto",  # Détection automatique du nombre de topics
            calculate_probabilities=False,  # Plus rapide sur CPU
            verbose=True,
        )

    def _get_stop_words(self, language: str) -> Optional[List[str]]:
        """
        Retourne les stop words pour la langue spécifiée

        Args:
            language: Code langue ("french", "english", "multilingual")

        Returns:
            Liste de stop words ou None
        """
        # Stop words français
        french_stops = [
            "le",
            "la",
            "les",
            "un",
            "une",
            "des",
            "de",
            "du",
            "et",
            "ou",
            "mais",
            "donc",
            "car",
            "pour",
            "dans",
            "sur",
            "à",
            "avec",
            "par",
            "ce",
            "qui",
            "que",
            "il",
            "elle",
            "on",
            "nous",
            "vous",
            "ils",
            "elles",
            "cette",
            "ces",
            "son",
            "sa",
            "ses",
            "leur",
            "leurs",
        ]

        # Stop words anglais
        english_stops = [
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "from",
            "as",
            "is",
            "was",
            "are",
            "were",
            "been",
            "be",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "can",
            "this",
            "that",
            "these",
            "those",
            "it",
            "its",
            "he",
            "she",
            "they",
            "we",
            "you",
        ]

        if language == "french":
            return french_stops
        elif language == "english":
            return english_stops
        elif language == "multilingual":
            return french_stops + english_stops
        else:
            return None

    def analyze_topics(
        self,
        embeddings: np.ndarray,
        documents: List[str],
        document_ids: List[str],
    ) -> Dict[str, Any]:
        """
        Analyse les topics à partir d'embeddings pré-calculés

        Args:
            embeddings: Array numpy (N x 768) des embeddings de documents
            documents: Liste des textes de documents (pour extraction de mots-clés)
            document_ids: Liste des IDs de documents

        Returns:
            Dictionnaire contenant :
            - topics: Liste des topics avec leurs informations
            - topic_assignments: Mapping document_id -> topic_id
            - outliers: Liste des document_ids considérés comme outliers (topic -1)
        """
        if len(embeddings) < self.min_topic_size:
            raise ValueError(
                f"Not enough documents ({len(embeddings)}). "
                f"Minimum required: {self.min_topic_size}"
            )

        print(f"Analyzing {len(embeddings)} documents...")

        # Fit BERTopic sur les embeddings pré-calculés
        topics, probs = self.model.fit_transform(documents, embeddings)

        print(f"Found {len(set(topics)) - 1} topics (excluding outliers)")

        # Construire la réponse
        result = {
            "topics": [],
            "topic_assignments": {},
            "outliers": [],
            "statistics": {
                "total_documents": len(documents),
                "num_topics": len(set(topics)) - 1,  # -1 pour exclure le topic outlier
                "num_outliers": topics.count(-1),
            },
        }

        # Pour chaque topic trouvé
        topic_info = self.model.get_topic_info()

        for _, row in topic_info.iterrows():
            topic_id = int(row["Topic"])

            # Skip outlier topic (-1)
            if topic_id == -1:
                continue

            # Récupérer les mots-clés du topic
            topic_words = self.model.get_topic(topic_id)

            if topic_words:
                # Extraire les top keywords (mots avec scores les plus élevés)
                keywords = [word for word, score in topic_words[:10]]

                # Générer un label automatique (3 premiers mots-clés)
                label = " - ".join(keywords[:3])

                # Trouver les documents assignés à ce topic
                doc_indices = [i for i, t in enumerate(topics) if t == topic_id]
                assigned_docs = [document_ids[i] for i in doc_indices]

                result["topics"].append(
                    {
                        "id": topic_id,
                        "label": label,
                        "keywords": keywords,
                        "documents": assigned_docs,
                        "size": len(assigned_docs),
                    }
                )

        # Mapping document_id -> topic_id
        for i, topic_id in enumerate(topics):
            doc_id = document_ids[i]

            if topic_id == -1:
                result["outliers"].append(doc_id)
            else:
                result["topic_assignments"][doc_id] = int(topic_id)

        # Trier les topics par taille (nombre de documents)
        result["topics"].sort(key=lambda x: x["size"], reverse=True)

        return result

    def get_topic_info(self, topic_id: int) -> Optional[Dict[str, Any]]:
        """
        Récupère les informations détaillées sur un topic spécifique

        Args:
            topic_id: ID du topic

        Returns:
            Dictionnaire avec informations du topic ou None si non trouvé
        """
        if not hasattr(self.model, "topics_"):
            return None

        topic_words = self.model.get_topic(topic_id)

        if not topic_words:
            return None

        keywords = [{"word": word, "score": float(score)} for word, score in topic_words]

        return {
            "id": topic_id,
            "keywords": keywords,
        }

    def reduce_topics(self, nr_topics: int) -> Dict[str, Any]:
        """
        Réduit le nombre de topics en fusionnant les plus similaires

        Args:
            nr_topics: Nombre de topics cible

        Returns:
            Résultat mis à jour après fusion
        """
        if not hasattr(self.model, "topics_"):
            raise ValueError("Model must be fitted before reducing topics")

        self.model.reduce_topics(None, nr_topics=nr_topics)

        # Note: Cette méthode nécessite de recalculer les assignments
        # Pour l'instant on retourne juste une confirmation
        return {"status": "topics_reduced", "nr_topics": nr_topics}
