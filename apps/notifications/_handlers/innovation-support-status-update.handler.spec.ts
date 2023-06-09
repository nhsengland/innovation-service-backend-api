// import { InnovationSupportStatusUpdateHandler } from './innovation-support-status-update.handler';

import { InnovationSupportStatusEnum } from '@notifications/shared/enums';

describe('Notifications / _handlers / innovation-support-status-update suite', () => {
  describe('Innovation is not found', () => {
    it('Should not send any email / inApp', () => {
      //TODO
      expect(true).toEqual(false);
    });
  });

  describe('Innovation status is not defined', () => {
    it('Should not send any email / inApp', () => {
      //TODO
      expect(true).toEqual(false);
    });
  });

  describe.each([
    InnovationSupportStatusEnum.COMPLETE,
    InnovationSupportStatusEnum.UNSUITABLE,
    InnovationSupportStatusEnum.UNASSIGNED
  ])('Innovation support status updated to %s', () => {
    it('Should send an email to innovation owner', () => {
      //TODO
      expect(true).toEqual(false);
    });
    it('Should send an email to the innovation collaborators', () => {
      //TODO
      expect(true).toEqual(false);
    });
    it('Should send inApp to innovation owner', () => {
      //TODO
      expect(true).toEqual(false);
    });
    it('Should send inApp to the innovation collaborators', () => {
      //TODO
      expect(true).toEqual(false);
    });
  });

  describe.each([
    InnovationSupportStatusEnum.NOT_YET,
    InnovationSupportStatusEnum.WAITING,
    InnovationSupportStatusEnum.WITHDRAWN,
    InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED
  ])('Innovation support status updated to %s', () => {
    it('Should send an email to innovation owner', () => {
      //TODO
      expect(true).toEqual(false);
    });
    it('Should send an email to the innovation collaborators', () => {
      //TODO
      expect(true).toEqual(false);
    });
    it('Should send inApp to innovation owner', () => {
      //TODO
      expect(true).toEqual(false);
    });
    it('Should send inApp to the innovation collaborators', () => {
      //TODO
      expect(true).toEqual(false);
    });
    it('Should send inApp to assessment users', () => {
      //TODO
      expect(true).toEqual(false);
    });
  });

  describe('Innovation support status updated to ENGAGING', () => {
    it('Should send an email to the assigned accessors', () => {
      //TODO
      expect(true).toEqual(false);
    })
    it('Should send an inApp to the assigned accessors', () => {
      //TODO
      expect(true).toEqual(false);
    })
  })
});
