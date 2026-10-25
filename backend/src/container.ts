import type { Database } from 'better-sqlite3';
import { UserRepository } from './repositories/userRepository.js';
import { AuthService } from './services/authService.js';
import { AuthController } from './controllers/authController.js';

/**
 * Composition root.
 *
 * Wiring happens exactly once, here, from a single database handle. Every
 * class below receives its collaborators through its constructor, so no module
 * reaches for a global - and a test can build the whole graph against a
 * throwaway database by calling this with a different handle.
 */
export interface Container {
  authController: AuthController;
  userRepository: UserRepository;
}

export function buildContainer(db: Database): Container {
  const userRepository = new UserRepository(db);
  const authService = new AuthService(userRepository);

  return {
    userRepository,
    authController: new AuthController(authService, userRepository),
  };
}
