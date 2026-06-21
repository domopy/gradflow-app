import Constants, { ExecutionEnvironment } from 'expo-constants';

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
