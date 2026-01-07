/**
 * Corpus analysis and knowledge graph IPC handlers
 */
import { ipcMain } from 'electron';
import { projectManager } from '../../services/project-manager.js';
import { pdfService } from '../../services/pdf-service.js';
import { successResponse, errorResponse, requireProject } from '../utils/error-handler.js';

export function setupCorpusHandlers() {
  ipcMain.handle('corpus:get-graph', async (_event, options?: any) => {
    console.log('📞 IPC Call: corpus:get-graph', options);
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      await pdfService.init(projectPath);
      const graphData = await pdfService.buildKnowledgeGraph(options);

      console.log('📤 IPC Response: corpus:get-graph', {
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
      });
      return successResponse({ graph: graphData });
    } catch (error: any) {
      console.error('❌ corpus:get-graph error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('corpus:get-statistics', async () => {
    console.log('📞 IPC Call: corpus:get-statistics');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      await pdfService.init(projectPath);
      const statistics = await pdfService.getCorpusStatistics();

      console.log('📤 IPC Response: corpus:get-statistics', statistics);
      return successResponse({ statistics });
    } catch (error: any) {
      console.error('❌ corpus:get-statistics error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('corpus:analyze-topics', async (_event, options?: any) => {
    console.log('📞 IPC Call: corpus:analyze-topics', options);
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      await pdfService.init(projectPath);
      const result = await pdfService.analyzeTopics(options);

      console.log('📤 IPC Response: corpus:analyze-topics', {
        topicCount: result.topics.length,
        documentCount: result.topicAssignments ? Object.keys(result.topicAssignments).length : 0,
      });
      return { ...successResponse(), ...result };
    } catch (error: any) {
      console.error('❌ corpus:analyze-topics error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('corpus:load-topics', async () => {
    console.log('📞 IPC Call: corpus:load-topics');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      await pdfService.init(projectPath);
      const result = pdfService.loadTopicAnalysis();

      if (result) {
        console.log('📤 IPC Response: corpus:load-topics', {
          topicCount: result.topics.length,
          documentCount: result.topicAssignments ? Object.keys(result.topicAssignments).length : 0,
          analysisDate: result.analysisDate,
        });
        return { ...successResponse(), ...result };
      } else {
        console.log('📤 IPC Response: corpus:load-topics - no saved analysis');
        return errorResponse('No saved topic analysis found');
      }
    } catch (error: any) {
      console.error('❌ corpus:load-topics error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('corpus:get-topic-timeline', async () => {
    console.log('📞 IPC Call: corpus:get-topic-timeline');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      await pdfService.init(projectPath);
      const timeline = pdfService.getTopicTimeline();

      if (timeline) {
        console.log('📤 IPC Response: corpus:get-topic-timeline', {
          yearCount: timeline.length,
          yearRange:
            timeline.length > 0 ? `${timeline[0].year}-${timeline[timeline.length - 1].year}` : 'N/A',
        });
        return successResponse({ timeline });
      } else {
        console.log('📤 IPC Response: corpus:get-topic-timeline - no timeline data');
        return errorResponse('No topic timeline data found');
      }
    } catch (error: any) {
      console.error('❌ corpus:get-topic-timeline error:', error);
      return errorResponse(error);
    }
  });

  // Textometrics handlers
  ipcMain.handle('corpus:get-text-statistics', async (_event, options?: any) => {
    console.log('📞 IPC Call: corpus:get-text-statistics', options);
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      await pdfService.init(projectPath);
      const statistics = await pdfService.getTextStatistics(options);

      console.log('📤 IPC Response: corpus:get-text-statistics', {
        totalWords: statistics.totalWords,
        vocabularySize: statistics.vocabularySize,
        topWordsCount: statistics.topWords?.length || 0,
      });
      return successResponse({ statistics });
    } catch (error: any) {
      console.error('❌ corpus:get-text-statistics error:', error);
      return errorResponse(error);
    }
  });

  console.log('✅ Corpus handlers registered');
}
