const chai = require('chai');
const {
  MilliSeconds,
  Seconds,
  Minutes,
  Hours,
  parse,
  sleep,
} = require('../lib/duration');
chai.should();

describe('Duration', () => {
  it('MilliSeconds', () => {
    new MilliSeconds(10).toMillis().should.equal(10);
    new MilliSeconds(1000).toString().should.equal('1s');
    new MilliSeconds(60 * 1000).toString().should.equal('1m');
    new MilliSeconds(60 * 60 * 1000).toString().should.equal('1h');

    (new MilliSeconds(10) < new MilliSeconds(20)).should.equal(true);
    (new MilliSeconds(10) > new MilliSeconds(20)).should.equal(false);
    (new MilliSeconds(10) - new MilliSeconds(10)).should.equal(0);
  });

  it('Seconds', () => {
    new Seconds(10).toMillis().should.equal(10 * 1000);
    new Seconds(10).toString().should.equal('10s');
    new Seconds(60).toString().should.equal('1m');
    new Seconds(60 * 60).toString().should.equal('1h');
  });

  it('Minutes', () => {
    new Minutes(10).toMillis().should.equal(10 * 60 * 1000);
    new Minutes(10).toString().should.equal('10m');
    new Minutes(60).toString().should.equal('1h');
  });

  it('Hours', () => {
    new Hours(10).toMillis().should.equal(10 * 60 * 60 * 1000);
    new Hours(10).toString().should.equal('10h');
  });

  it('sleep', async () => {
    await sleep(new Seconds(1));
  });

  it('parse', async () => {
    parse('20ms').toString().should.equal('20ms');
    parse('20s').toString().should.equal('20s');
    parse('20m').toString().should.equal('20m');
    parse('20h').toString().should.equal('20h');
  });
});
