/* global describe xdescribe it expect */
import { isEqual } from 'lodash';
import sinon from 'sinon';
import { mockReq, mockRes } from 'sinon-express-mock';

import {
  buildChallengeUrl,
  createChallengeUrlResolver,
  createRedirectToCurrentChallenge,
  getFirstChallenge
} from '../boot/challenge';

const firstChallengeUrl = '/learn/the/first/challenge';
const requestedChallengeUrl = '/learn/my/actual/challenge';
const mockChallenge = {
  id: '123abc',
  block: 'actual',
  superBlock: 'my',
  dashedName: 'challenge'
};
const mockFirstChallenge = {
  id: '456def',
  block: 'first',
  superBlock: 'the',
  dashedName: 'challenge'
};
const mockUser = {
  username: 'camperbot',
  currentChallengeId: '123abc'
};
const mockApp = {
  models: {
    Challenge: {
      find() {
        return firstChallengeUrl;
      },
      findById(id, cb) {
        return id === mockChallenge.id
          ? cb(null, mockChallenge)
          : cb(new Error('challenge not found'));
      }
    }
  }
};
const mockGetFirstChallenge = () => firstChallengeUrl;
const firstChallengeQuery = {
  where: { challengeOrder: 0, superOrder: 1, order: 0 }
};

describe('boot/challenge', () => {
  xdescribe('backendChallengeCompleted');

  xdescribe('buildUserUpdate');

  describe('buildChallengeUrl', () => {
    it('resolves the correct Url for the provided challenge', () => {
      const result = buildChallengeUrl(mockChallenge);

      expect(result).toEqual(requestedChallengeUrl);
    });

    it('can handle non-url-complient challenge names', () => {
      const challenge = { ...mockChallenge, superBlock: 'my awesome' };
      const expected = '/learn/my-awesome/actual/challenge';
      const result = buildChallengeUrl(challenge);

      expect(result).toEqual(expected);
    });
  });

  describe('challengeUrlResolver', () => {
    it('resolves to the first challenge url by default', async () => {
      const challengeUrlResolver = await createChallengeUrlResolver(mockApp, {
        _getFirstChallenge: mockGetFirstChallenge
      });

      return challengeUrlResolver().then(url => {
        expect(url).toEqual(firstChallengeUrl);
      });
    });

    it('returns the first challenge url if the provided id does not relate to a challenge', async () => {
      const challengeUrlResolver = await createChallengeUrlResolver(mockApp, {
        _getFirstChallenge: mockGetFirstChallenge
      });

      return challengeUrlResolver('not-a-real-challenge').then(url => {
        expect(url).toEqual(firstChallengeUrl);
      });
    });

    it('resolves the correct url for the requested challenge', async () => {
      const challengeUrlResolver = await createChallengeUrlResolver(mockApp, {
        _getFirstChallenge: mockGetFirstChallenge
      });

      return challengeUrlResolver('123abc').then(url => {
        expect(url).toEqual(requestedChallengeUrl);
      });
    });
  });

  xdescribe('completedChallenge');

  describe('getFirstChallenge', () => {
    const createMockChallengeModel = success =>
      success
        ? {
            findOne(query, cb) {
              return isEqual(query, firstChallengeQuery)
                ? cb(null, mockFirstChallenge)
                : cb(new Error('no challenge found'));
            }
          }
        : {
            findOne(_, cb) {
              return cb(new Error('no challenge found'));
            }
          };
    it('returns the correct challenge url from the model', async () => {
      const result = await getFirstChallenge(createMockChallengeModel(true));

      expect(result).toEqual(firstChallengeUrl);
    });
    it('returns the learn base if no challenges found', async () => {
      const result = await getFirstChallenge(createMockChallengeModel(false));

      expect(result).toEqual('/learn');
    });
  });

  xdescribe('modernChallengeCompleted');

  xdescribe('projectcompleted');

  describe('redirectToCurrentChallenge', () => {
    const mockHomeLocation = 'https://www.example.com';
    const mockLearnUrl = `${mockHomeLocation}/learn`;

    it('redircts to the learn base url for non-users', async done => {
      const redirectToCurrentChallenge = createRedirectToCurrentChallenge(
        () => {},
        { _homeLocation: mockHomeLocation, _learnUrl: mockLearnUrl }
      );
      const req = mockReq();
      const res = mockRes();
      const next = sinon.spy();
      await redirectToCurrentChallenge(req, res, next);

      expect(res.redirect.calledWith(mockLearnUrl));
      done();
    });

    it('redirects to the url provided by the challengeUrlResolver', async done => {
      const challengeUrlResolver = await createChallengeUrlResolver(mockApp, {
        _getFirstChallenge: mockGetFirstChallenge
      });
      const expectedUrl = `${mockHomeLocation}${requestedChallengeUrl}`;
      const redirectToCurrentChallenge = createRedirectToCurrentChallenge(
        challengeUrlResolver,
        { _homeLocation: mockHomeLocation, _learnUrl: mockLearnUrl }
      );
      const req = mockReq({
        user: mockUser
      });
      const res = mockRes();
      const next = sinon.spy();
      await redirectToCurrentChallenge(req, res, next);

      expect(res.redirect.calledWith(expectedUrl)).toBe(true);
      done();
    });

    it('redirects to the first challenge for users without a currentChallengeId', async done => {
      const challengeUrlResolver = await createChallengeUrlResolver(mockApp, {
        _getFirstChallenge: mockGetFirstChallenge
      });
      const redirectToCurrentChallenge = createRedirectToCurrentChallenge(
        challengeUrlResolver,
        { _homeLocation: mockHomeLocation, _learnUrl: mockLearnUrl }
      );
      const req = mockReq({
        user: { ...mockUser, currentChallengeId: '' }
      });
      const res = mockRes();
      const next = sinon.spy();
      await redirectToCurrentChallenge(req, res, next);
      const expectedUrl = `${mockHomeLocation}${firstChallengeUrl}`;
      expect(res.redirect.calledWith(expectedUrl)).toBe(true);
      done();
    });
  });

  xdescribe('redirectToLearn');
});
