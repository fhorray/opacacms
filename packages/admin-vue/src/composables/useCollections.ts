import { useStore } from '@nanostores/vue';
import { $collections, $loading, $error } from 'opacacms';

export function useCollections() {
  return useStore($collections);
}

export function useLoading() {
  return useStore($loading);
}

export function useError() {
  return useStore($error);
}
