export interface IInstrumentationService {
  startSpan<T>(options: { name: string; op?: string; attributes?: Record<string, unknown> }, callback: () => T): T;
  instrumentServerAction<T>(name: string, options: Record<string, unknown>, callback: () => T): Promise<T>;
}
