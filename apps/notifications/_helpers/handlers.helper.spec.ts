import { NotificationPreferenceEnum } from '@notifications/shared/enums';
import { HandlersHelper } from './handlers.helper';

describe('notification handlers helper spec', () => {
  describe('isEmailPreferenceInstantly', () => {
    it('should return true when the email preference is yes', () => {
      expect(HandlersHelper.shouldSendEmail('TASK', { TASK: NotificationPreferenceEnum.YES } as any)).toBe(true);
    });

    it('should return false when the email preference is no', () => {
      expect(HandlersHelper.shouldSendEmail('TASK', { TASK: NotificationPreferenceEnum.NO } as any)).toBe(false);
    });

    it('should return true when the email preference for DOCUMENTS is not defined', () => {
      expect(HandlersHelper.shouldSendEmail('DOCUMENTS', { TASK: NotificationPreferenceEnum.NO } as any)).toBe(true);
    });

    it('should return true when the email preference is not defined', () => {
      expect(HandlersHelper.shouldSendEmail('INNOVATION_MANAGEMENT')).toBe(true);
    });
  });

  describe('formatStringArray with the correct format', () => {
    test('should return "One" for a single item array', () => {
      const result = HandlersHelper.formatStringArray(['One']);
      expect(result).toBe('One');
    });

    test('should return "One and Two" for a two-item array', () => {
      const result = HandlersHelper.formatStringArray(['One', 'Two']);
      expect(result).toBe('One and Two');
    });

    test('should return "One, Two and Three" for a three-item array', () => {
      const result = HandlersHelper.formatStringArray(['One', 'Two', 'Three']);
      expect(result).toBe('One, Two and Three');
    });

    test('should return "One, Two, Three and Four" for a four-item array', () => {
      const result = HandlersHelper.formatStringArray(['One', 'Two', 'Three', 'Four']);
      expect(result).toBe('One, Two, Three and Four');
    });
  });
});
