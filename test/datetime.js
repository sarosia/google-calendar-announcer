const DateTime = require('../lib/datetime');
const {Duration, Minutes} = require('../lib/duration');
const {expect} = require('chai');

describe('DateTime', () => {
  it('Add', () => {
    let datetime = new DateTime(1000);
    expect(datetime.valueOf()).equal(1000);
    datetime = datetime.add(new Minutes(10));
    expect(datetime.valueOf()).equal(1000 + 10 * 60 * 1000);
    expect(datetime.toString()).equal('1970-01-01T00:10:01.000Z');

    expect(() => {
      datetime.add(new DateTime(1000),
      );
    }).throw('Cannot add a DateTime to a DateTime.');
  });

  it('Sub', () => {
    let datetime = new DateTime(1000 * 1000);
    expect(datetime.valueOf()).equal(1000 * 1000);
    datetime = datetime.sub(new Minutes(10));
    expect(datetime.valueOf()).equal(1000 * 1000 - 10 * 60 * 1000);
    expect(datetime.toString()).equal('1970-01-01T00:06:40.000Z');

    const duration = datetime.sub(new DateTime(1000));
    expect(duration).to.be.an.instanceof(Duration);
    expect(duration.valueOf()).equal(399000);
  });
});
