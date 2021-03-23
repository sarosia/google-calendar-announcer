const CastClient = require('castv2-promise');
const ip = require('ip');
const logger = require('./logger');
const tts = require('./tts');

class Boardcaster {
  #audio = null;
  #deviceNames = [];
  #port = null;

  constructor(config) {
    this.#deviceNames = config.devices;
    this.#port = config.port;
  }

  getAudio() {
    return this.#audio;
  }

  async boardcast(text) {
    this.#audio = await tts(text);
    logger.info(`Converted "${text}" to speech.`);

    const devices = [];
    for (const name of this.#deviceNames) {
      try {
        const device = await CastClient.find(name);
        devices.push(device);
      } catch (e) {
        logger.error(`Skip boardcasting to device ${name}`, e);
      }
    }

    return Promise.all(devices.map((device) => {
      this.announce(device);
    }));
  }

  async announce(device) {
    const origVolume = await device.getVolume();
    logger.info(`Current device volume is ${origVolume}.`);
    await device.setVolume(1);
    await device.play(`http://${ip.address()}:${this.#port}/audio`);
    await device.setVolume(origVolume);
    logger.info(`Restore device volume to ${origVolume}.`);
    await device.close();
  }
}

module.exports = Boardcaster;
