const CastClient = require('castv2-promise');
const ip = require('ip');
const tts = require('./tts');

class Boardcaster {
  #audio = null;
  #deviceNames = [];
  #port = null;
  #logger = null;

  constructor(config, logger = console) {
    this.#deviceNames = config.devices;
    this.#port = config.port;
    this.#logger = logger;
  }

  getAudio() {
    return this.#audio;
  }

  async boardcast(text, targetDevices) {
    this.#audio = await tts(text);
    this.#logger.info(`Converted "${text}" to speech.`);

    let devicesToUse = this.#deviceNames;
    if (targetDevices && Array.isArray(targetDevices)) {
      devicesToUse = this.#deviceNames.filter((name) =>
        targetDevices.includes(name)
      );
    }

    const devices = [];
    for (const name of devicesToUse) {
      try {
        const device = await CastClient.find(name);
        devices.push(device);
      } catch (e) {
        this.#logger.error(`Skip boardcasting to device ${name}`, e);
      }
    }

    return Promise.all(
      devices.map((device) => {
        this.announce(device);
      })
    );
  }

  async announce(device) {
    const origVolume = await device.getVolume();
    this.#logger.info(`Current device volume is ${origVolume}.`);
    await device.setVolume(1);
    await device.play(`http://${ip.address()}:${this.#port}/audio`);
    await device.setVolume(origVolume);
    this.#logger.info(`Restore device volume to ${origVolume}.`);
    await device.close();
  }
}

module.exports = Boardcaster;
