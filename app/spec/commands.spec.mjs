import { help } from '../src/commands/help.js';
import { balance } from '../src/commands/balance.js';
import { executeCommand, getOption } from '../src/commands/index.js';
import { embedResponse } from '../src/responses/index.js';
import { connect } from '../src/db/index.js';
import { Pouch } from '../src/pouch/index.js';
import { Token } from '../src/tokens/index.js';

describe('help', () => {
  it('should respond with help text', () => {
    const res = help({ type: 2 });
    expect(res).toEqual(embedResponse({
      title: 'Kangaroo Help',
      description: 'Hi there :)'
    }));
  });
});

describe('balance', () => {
  beforeAll(async () => {
    await connect();
  });

  describe('with balance', () => {
    beforeAll(async () => {
      const tokenETH = await (new Token({ ticker: 'ETH' })).save();
      const tokenDAI = await (new Token({ ticker: 'DAI' })).save();
      await (new Token({ ticker: 'DNT' })).save();
      const userId = '1234';
      await (new Pouch({ userId, tokenId: tokenETH.id, balance: 0.2 })).save();
      await (new Pouch({ userId, tokenId: tokenDAI.id, balance: 30 })).save();
    });
    
    afterAll(async () => {
      await Pouch.deleteMany({});
      await Token.deleteMany({});
    });

    it('should respond with a specific balance if ticker is provided', async () => {
      const interaction = {
        data: { options: [ { name: 'ticker', value: 'ETH' } ] },
        user: { id: '1234' }
      };
      const res = await balance(interaction);
      expect(res).toEqual(embedResponse({
        title: 'ETH Balance',
        description: '0.2 ETH'
      }));
    });

    it('should respond with a specific balance if ticker is provided case-insensitive', async () => {
      const interaction = {
        data: { options: [ { name: 'ticker', value: 'dai' } ] },
        user: { id: '1234' }
      };
      const res = await balance(interaction);
      expect(res).toEqual(embedResponse({
        title: 'DAI Balance',
        description: '30 DAI'
      }));
    });

    it('should respond with all balances if no options are provided', async () => {
      const interaction = { data: {}, user: { id: '1234' } };
      const res = await balance(interaction);
      expect(res).toEqual(embedResponse({
        title: 'All Balances',
        description: '0.2 ETH\n30 DAI'
      }));
    });

    it('should respond with an error message if an invalid ticker is provided', async () => {
      const interaction = {
        data: { options: [ { name: 'ticker', value: 'DOGE' } ] },
        user: { id: '1234' }
      };
      const res = await balance(interaction);
      expect(res).toEqual(embedResponse({
        title: 'Error',
        description: 'That token doesn\'t exist :('
      }));
    });
  });

  describe('with no balance', () => {
    beforeAll(async () => {
      await (new Token({ ticker: 'ETH' })).save();
      await (new Token({ ticker: 'DAI' })).save();
      await (new Token({ ticker: 'DNT' })).save();
    });

    afterAll(async () => {
      await Pouch.deleteMany({});
      await Token.deleteMany({});
    });
    it('should show a no balance message if no options are provided', async () => {
      const interaction = { data: {}, user: { id: '1234' } };
      const res = await balance(interaction);
      expect(res).toEqual(embedResponse({
        title: 'All Balances',
        description: 'You don\'t have any tokens :('
      }));
    });

    it('should show a zero balance if no ticker is provided', async () => {
      const interaction = {
        data: {
          options: [
            {
              name: 'ticker',
              value: 'DAI'
            }
          ]
        },
        user: { id: '1234' }
      };
      const res = await balance(interaction);
      expect(res).toEqual(embedResponse({
        title: 'DAI Balance',
        description: '0 DAI'
      }));
    });
  });
});

describe('execute command', () => {
  it('should select function based on command', async () => {
    const interaction = {
      type: 2,
      data: {
        name: 'help'
      }
    };
    const res = await executeCommand(interaction);
    expect(res).toEqual(embedResponse({
      title: 'Kangaroo Help',
      description: 'Hi there :)'
    }));
  });
});

describe('getOption', () => {
  it('should return the value of an option', () => {
    const interaction = {
      data: {
        options: [
          { name: 'jkl', value: 'pio', },
          { name: 'abc', value: 'def', }
        ]
      }
    };
    const value = getOption(interaction, 'abc');
    expect(value).toEqual('def');
  });

  it('should return undefined if the option is not there', () => {
    const interaction = {
      data: {
        options: [
          { name: 'jkl', value: 'pio', },
          { name: 'abc', value: 'def', }
        ]
      }
    };
    const value = getOption(interaction, 'not here');
    expect(value).toBeUndefined();
  });

  it('should return undefined if there are no options', () => {
    const interaction = { data: {} };
    const value = getOption(interaction, 'abc');
    expect(value).toBeUndefined();
  });
});
