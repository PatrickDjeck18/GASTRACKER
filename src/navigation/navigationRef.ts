import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: object): void {
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate(name, params);
  }
}

