import type { ITranscriptionService } from '@/src/application/services/transcription.service.interface';

export class MockTranscriptionService implements ITranscriptionService {
  async transcribeAudio(): Promise<string> {
    return [
      '00:00 Good evening, tonight wildfires spread across the state.',
      '02:30 Crews are battling the flames on two fronts.',
      '05:00 In other news, local election results are in.',
      '07:30 Turnout reached a record high this year.',
    ].join('\n');
  }
}
