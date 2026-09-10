const chai = require('chai');
const chaiHttp = require('chai-http');
const Apper = require('@sarosia/apper');
const { app } = require('../lib/app');

chai.use(chaiHttp);
const { expect } = chai;

describe('Apper Migration & Google SSO Integration', () => {
  describe('When OAuth credentials are not configured', () => {
    let expressApp;
    let auth;

    before(() => {
      expressApp = app.getExpress();
      auth = app.getAuth();
    });

    it('auth is not enabled', () => {
      expect(auth.isEnabled()).to.be.false;
    });

    it('redirects /login to /', async () => {
      const res = await chai.request(expressApp).get('/login').redirects(0);
      expect(res).to.have.status(302);
      expect(res.header.location).to.equal('/');
    });

    it('serves /apper-auth.js and /apper-auth.css without authentication', async () => {
      const resJs = await chai
        .request(expressApp)
        .get('/apper-auth.js')
        .buffer();
      expect(resJs).to.have.status(200);
      expect(resJs.text).to.include('ApperAuth');

      const resCss = await chai
        .request(expressApp)
        .get('/apper-auth.css')
        .buffer();
      expect(resCss).to.have.status(200);
      expect(resCss.text).to.include('.user-profile-badge');
    });

    it('returns unauthenticated info for /auth/me', async () => {
      const res = await chai.request(expressApp).get('/auth/me');
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({ authenticated: false, user: null });
    });

    it('allows unauthenticated HTML access to / without redirecting to /login', async () => {
      const res = await chai
        .request(expressApp)
        .get('/')
        .set('Accept', 'text/html')
        .redirects(0);

      expect(res).to.have.status(200);
      expect(res.text).to.include('Google Calendar Announcer');
    });

    it('allows unauthenticated access to /events without 401 Unauthorized', async () => {
      const res = await chai
        .request(expressApp)
        .get('/events')
        .set('Accept', 'application/json');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array');
    });

    it('allows public access to /audio', async () => {
      const res = await chai.request(expressApp).get('/audio');
      expect(res).to.have.status(404);
    });

    it('stores boardcaster and calendarManager on Apper context', () => {
      const ctx = app.getContext();
      expect(ctx.boardcaster).to.be.an('object');
      expect(ctx.calendarManager).to.be.an('object');
      expect(ctx.logger).to.be.an('object');
    });

    it('starts calendarManager when app.start is called', () => {
      const ctx = app.getContext();
      let calendarManagerStarted = false;
      const origStart = ctx.calendarManager.start;
      ctx.calendarManager.start = () => {
        calendarManagerStarted = true;
      };

      const expressAppInstance = app.getExpress();
      const origListen = expressAppInstance.listen;
      expressAppInstance.listen = () => ({
        close: () => {},
      });

      try {
        app.start();
        expect(calendarManagerStarted).to.be.true;
      } finally {
        ctx.calendarManager.start = origStart;
        expressAppInstance.listen = origListen;
      }
    });
  });

  describe('When OAuth credentials are configured', () => {
    let authedApp;
    let expressApp;
    let auth;

    before(() => {
      authedApp = new Apper('announcer_test', () => {}, {
        auth: {
          enabled: true,
          clientId: 'test-google-client-id',
          clientSecret: 'test-google-client-secret',
          cookieName: 'announcer_session',
          publicRoutes: ['/audio'],
        },
      });
      authedApp.get('/events', (ctx, req, res) => {
        res.json([]);
      });
      authedApp.get('/audio', (ctx, req, res) => {
        res.status(404).send('No audio available.');
      });
      expressApp = authedApp.getExpress();
      auth = authedApp.getAuth();
    });

    it('auth is enabled', () => {
      expect(auth.isEnabled()).to.be.true;
    });

    it('serves /login page without authentication', async () => {
      const res = await chai.request(expressApp).get('/login');
      expect(res).to.have.status(200);
      expect(res.text).to.include('Sign in with Google');
    });

    it('redirects unauthenticated HTML requests to /login', async () => {
      const res = await chai
        .request(expressApp)
        .get('/')
        .set('Accept', 'text/html')
        .redirects(0);

      expect(res).to.have.status(302);
      expect(res.header.location).to.include('/login');
    });

    it('returns 401 Unauthorized for unauthenticated API requests', async () => {
      const res = await chai
        .request(expressApp)
        .get('/events')
        .set('Accept', 'application/json');

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });

    it('allows public access to /audio without session cookie', async () => {
      const res = await chai.request(expressApp).get('/audio');
      expect(res).to.have.status(404);
    });

    it('allows access to protected routes with valid session cookie', async () => {
      const token = auth.createSessionToken({
        email: 'authorized@example.com',
        name: 'Authorized User',
      });

      const res = await chai
        .request(expressApp)
        .get('/events')
        .set('Cookie', `${auth.getCookieName()}=${token}`);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array');
    });
  });
});
