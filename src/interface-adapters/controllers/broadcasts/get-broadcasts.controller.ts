import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBroadcastsUseCase } from '@/src/application/use-cases/broadcasts/get-broadcasts.use-case';
import type { Broadcast } from '@/src/entities/models/broadcast';

function presenter(broadcasts: Broadcast[], instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'getBroadcasts Presenter', op: 'serialize' }, () =>
    broadcasts.map(broadcast => ({
      id: broadcast.id,
      filename: broadcast.filename,
      url: broadcast.url,
      size: broadcast.size,
      uploadedAt: broadcast.uploadedAt.toISOString(),
      createdAt: broadcast.createdAt.toISOString(),
      updatedAt: broadcast.updatedAt.toISOString(),
    })),
  );
}

export type IGetBroadcastsController = ReturnType<typeof getBroadcastsController>;

export const getBroadcastsController =
  (instrumentationService: IInstrumentationService, getBroadcastsUseCase: IGetBroadcastsUseCase) =>
  (): Promise<ReturnType<typeof presenter>> => {
    return instrumentationService.startSpan({ name: 'getBroadcasts Controller' }, async () => {
      const broadcasts = await getBroadcastsUseCase();
      return presenter(broadcasts, instrumentationService);
    });
  };
