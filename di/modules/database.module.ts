import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { TransactionManagerService } from '@/src/infrastructure/services/transaction-manager.service';
import { MockTransactionManagerService } from '@/src/infrastructure/services/transaction-manager.service.mock';

export function createTransactionManagerModule() {
  const transactionManagerModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    transactionManagerModule.bind(DI_SYMBOLS.ITransactionManagerService).toClass(MockTransactionManagerService);
  } else {
    transactionManagerModule.bind(DI_SYMBOLS.ITransactionManagerService).toClass(TransactionManagerService);
  }

  return transactionManagerModule;
}
