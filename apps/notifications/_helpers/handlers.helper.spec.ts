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
});
