import { getOption } from './index.js';
import { getUserId } from '../interactions/index.js';
import { getOrCreateWallet } from '../user/index.js';
import { getTokenByTicker } from '../tokens/index.js';
import ethers from 'ethers';
import {
  missingOptionsResponse,
  withdrawHelpResponse,
  previewTransactionResponse,
  transactionResponse,
  tokenNotFoundResponse,
  invalidAmountResponse,
  invalidAddressResponse,
  transactionFailedResponse,
  notUnlockedResponse,
} from '../responses/index.js';
import { Amount } from '../eth2/amount.js';

export async function withdraw(interaction) {
  const userId = getUserId(interaction);
  const amount = getOption(interaction, 'amount');
  const ticker = getOption(interaction, 'ticker')?.toUpperCase();
  const recipientAddress = getOption(interaction, 'address');
  const confirm = getOption(interaction, 'confirm')?.toUpperCase();

  if (!amount && !ticker && !recipientAddress && !confirm) {
    return withdrawHelpResponse();
  }

  if (amount && ticker && recipientAddress) {
    const token = await getTokenByTicker(ticker);
    if (!token) {
      return tokenNotFoundResponse();
    }
    let primaryAmount;
    try {
      primaryAmount = Amount.fromStringValue(token, amount);
    } catch (e) {
      return invalidAmountResponse();
    }
    try {
      ethers.utils.getAddress(recipientAddress);
    } catch {
      return invalidAddressResponse();
    }
    const userWallet = await getOrCreateWallet(userId);
    const feeAmount = await userWallet.getTransferFee(token, recipientAddress);
    if (confirm === 'CONFIRM') {
      if (!await userWallet.getUnlocked()) {
        return notUnlockedResponse();
      }
      try {
        await userWallet.transfer(
          token,
          recipientAddress,
          primaryAmount,
          feeAmount
        );
      } catch {
        return transactionFailedResponse();
      }
      return await transactionResponse(
        `Withdraw tokens to ${recipientAddress}`,
        primaryAmount.getClosestPackable(),
        feeAmount.getClosestPackable(),
        'TODO: include zksync insert (do this on aesthetic update)',
      );
    } else {
      return await previewTransactionResponse(
        `Withdraw tokens to ${recipientAddress}`,
        primaryAmount.getClosestPackable(),
        feeAmount.getClosestPackable(),
        `/withdraw ${amount} ${ticker} ${recipientAddress} confirm`,
        'TODO: include zksync insert (do this on aesthetic update)',
      );
    }
  } else {
    const missingOptions = [];
    if (!amount) {
      missingOptions.push('amount');
    }
    if (!ticker) {
      missingOptions.push('ticker');
    }
    if (!recipientAddress) {
      missingOptions.push('address');
    }
    return missingOptionsResponse(missingOptions);
  }
}
