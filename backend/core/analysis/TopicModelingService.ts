/**
 * TopicModelingService - Gestion du service Python BERTopic
 *
 * Ce service gère le cycle de vie du service Python pour le topic modeling :
 * - Démarrage/arrêt du subprocess Python
 * - Health checks
 * - Communication HTTP avec le service
 * - Parsing des réponses
 */

import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// MARK: - Types

export interface Topic {
  id: number;
  label: string;
  keywords: string[];
  documents: string[];
  size: number;
}

export interface TopicAnalysisResult {
  topics: Topic[];
  topicAssignments: Record<string, number>;
  outliers: string[];
  statistics: {
    totalDocuments: number;
    numTopics: number;
    numOutliers: number;
  };
}

export interface TopicAnalysisOptions {
  minTopicSize?: number;
  language?: 'french' | 'english' | 'multilingual';
  nGramRange?: [number, number];
}

interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

interface AnalyzeResponse {
  topics: Topic[];
  topic_assignments: Record<string, number>;
  outliers: string[];
  statistics: {
    total_documents: number;
    num_topics: number;
    num_outliers: number;
  };
}

// MARK: - TopicModelingService

export class TopicModelingService {
  private pythonProcess?: ChildProcess;
  private serviceURL: string = 'http://127.0.0.1:8001';
  private isStarting: boolean = false;
  private isRunning: boolean = false;
  private startupTimeout: number = 30000; // 30 secondes

  /**
   * Démarre le service Python en subprocess
   *
   * @throws Error si Python n'est pas disponible ou si le service ne démarre pas
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Topic modeling service already running');
      return;
    }

    if (this.isStarting) {
      console.log('⚠️ Topic modeling service is already starting');
      return;
    }

    this.isStarting = true;

    try {
      console.log('🚀 Starting topic modeling service...');

      // Déterminer le chemin vers le script Python
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const pythonServicePath = path.join(
        __dirname,
        '../../../python-services/topic-modeling'
      );

      // Vérifier que Python est disponible
      await this.checkPythonAvailable();

      // Démarrer le subprocess Python
      this.pythonProcess = spawn('python', ['main.py'], {
        cwd: pythonServicePath,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Logger la sortie standard
      this.pythonProcess.stdout?.on('data', (data) => {
        console.log(`[Python] ${data.toString().trim()}`);
      });

      // Logger les erreurs
      this.pythonProcess.stderr?.on('data', (data) => {
        console.error(`[Python Error] ${data.toString().trim()}`);
      });

      // Gérer la fermeture du processus
      this.pythonProcess.on('exit', (code) => {
        console.log(`🛑 Python service exited with code ${code}`);
        this.isRunning = false;
        this.pythonProcess = undefined;
      });

      // Attendre que le service soit prêt (health check)
      await this.waitForServiceReady();

      this.isRunning = true;
      this.isStarting = false;

      console.log('✅ Topic modeling service started successfully');
    } catch (error) {
      this.isStarting = false;
      this.isRunning = false;

      // Nettoyer le processus si erreur
      if (this.pythonProcess) {
        this.pythonProcess.kill();
        this.pythonProcess = undefined;
      }

      console.error('❌ Failed to start topic modeling service:', error);
      throw error;
    }
  }

  /**
   * Arrête le service Python
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.pythonProcess) {
      console.log('⚠️ Topic modeling service not running');
      return;
    }

    console.log('🛑 Stopping topic modeling service...');

    return new Promise((resolve) => {
      if (this.pythonProcess) {
        this.pythonProcess.on('exit', () => {
          this.isRunning = false;
          this.pythonProcess = undefined;
          console.log('✅ Topic modeling service stopped');
          resolve();
        });

        // Tenter SIGTERM d'abord
        this.pythonProcess.kill('SIGTERM');

        // Si toujours actif après 5s, forcer SIGKILL
        setTimeout(() => {
          if (this.pythonProcess && !this.pythonProcess.killed) {
            console.log('⚠️ Forcing kill of Python service...');
            this.pythonProcess.kill('SIGKILL');
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Vérifie si Python est disponible sur le système
   *
   * @throws Error si Python n'est pas disponible
   */
  private async checkPythonAvailable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonCheck = spawn('python', ['--version']);

      pythonCheck.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              'Python is not available. Please install Python 3.11+ and required dependencies.'
            )
          );
        }
      });

      pythonCheck.on('error', () => {
        reject(
          new Error(
            'Python is not available. Please install Python 3.11+ and required dependencies.'
          )
        );
      });
    });
  }

  /**
   * Attend que le service soit prêt en effectuant des health checks
   *
   * @throws Error si le service ne répond pas dans le délai imparti
   */
  private async waitForServiceReady(): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 1000; // Vérifier toutes les 1 seconde

    while (Date.now() - startTime < this.startupTimeout) {
      try {
        const isHealthy = await this.isHealthy();
        if (isHealthy) {
          return;
        }
      } catch (error) {
        // Service pas encore prêt, continuer à attendre
      }

      // Attendre avant le prochain check
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error(
      `Topic modeling service did not start within ${this.startupTimeout / 1000}s`
    );
  }

  /**
   * Vérifie si le service est en bonne santé
   *
   * @returns true si le service répond correctement
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isRunning && !this.isStarting) {
      return false;
    }

    try {
      const response = await fetch(`${this.serviceURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as HealthResponse;
      return data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Analyse les topics d'un corpus de documents
   *
   * @param embeddings - Embeddings des documents (N x 768)
   * @param documents - Textes des documents
   * @param documentIds - IDs des documents
   * @param options - Options d'analyse
   * @returns Résultat de l'analyse de topics
   *
   * @throws Error si le service n'est pas disponible ou si l'analyse échoue
   */
  async analyzeTopics(
    embeddings: Float32Array[],
    documents: string[],
    documentIds: string[],
    options: TopicAnalysisOptions = {}
  ): Promise<TopicAnalysisResult> {
    if (!this.isRunning) {
      throw new Error('Topic modeling service is not running. Call start() first.');
    }

    // Valider les paramètres
    if (embeddings.length !== documents.length || embeddings.length !== documentIds.length) {
      throw new Error('embeddings, documents, and documentIds must have the same length');
    }

    if (embeddings.length < (options.minTopicSize || 5)) {
      throw new Error(
        `Not enough documents (${embeddings.length}). Minimum: ${options.minTopicSize || 5}`
      );
    }

    console.log(`📊 Analyzing topics for ${embeddings.length} documents...`);

    try {
      // Convertir Float32Array en arrays normaux pour JSON
      const embeddingsArrays = embeddings.map((emb) => Array.from(emb));

      // Construire la requête
      const requestBody = {
        embeddings: embeddingsArrays,
        documents: documents,
        document_ids: documentIds,
        min_topic_size: options.minTopicSize || 5,
        language: options.language || 'multilingual',
        n_gram_range: options.nGramRange || [1, 3],
      };

      // Envoyer la requête
      const response = await fetch(`${this.serviceURL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Topic analysis failed: ${response.status} - ${errorText}`);
      }

      // Parser la réponse
      const data = (await response.json()) as AnalyzeResponse;

      const result: TopicAnalysisResult = {
        topics: data.topics,
        topicAssignments: data.topic_assignments,
        outliers: data.outliers,
        statistics: {
          totalDocuments: data.statistics.total_documents,
          numTopics: data.statistics.num_topics,
          numOutliers: data.statistics.num_outliers,
        },
      };

      console.log(`✅ Topic analysis complete: ${result.statistics.numTopics} topics found`);

      return result;
    } catch (error) {
      console.error('❌ Topic analysis failed:', error);
      throw error;
    }
  }

  /**
   * Retourne l'état du service
   */
  getStatus(): {
    isRunning: boolean;
    isStarting: boolean;
    serviceURL: string;
  } {
    return {
      isRunning: this.isRunning,
      isStarting: this.isStarting,
      serviceURL: this.serviceURL,
    };
  }
}
