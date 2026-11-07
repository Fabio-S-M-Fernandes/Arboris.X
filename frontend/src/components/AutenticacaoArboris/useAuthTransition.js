import { useContext } from 'react';
import { AuthTransitionContext } from './authTransitionContext';

export function useAuthTransition() {
  const context = useContext(AuthTransitionContext);
  if (!context) throw new Error('useAuthTransition deve ser usado dentro de AuthTransitionProvider.');
  return context;
}
