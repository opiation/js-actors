// @ts-check

import c from "chalk";
import { node } from "./actor.js";

const star = node({
  listeners: {
    onActorMessageSent(sentMessage, recipientAddress) {
      console.debug(
        `✉️ Message %O was sent to actor at recipient address ${c.bold.blue(recipientAddress)}.`,
        sentMessage,
      );
    },
    onActorSpawned(newActorAddress) {
      console.debug(
        `🤖 New actor spawned at address ${c.bold.blue(newActorAddress)}.`,
      );
    },
    onActorStateChanged(address, currentState, previousState) {
      console.debug(
        `🔄 Actor at address ${c.bold.blue(address)} changed state from %O to %O.`,
        previousState,
        currentState,
      );
    },
    onActorStatusChanged(address, currentStatus) {
      console.debug(
        `🔄 Actor at address ${c.bold.blue(address)} is now ${c.bold.yellow(currentStatus)}.`,
      );
    },
  },
});

/**
 * @typedef {{ amount: number, type: "deposit" } | { amount: number, type: "withdrawal" } | { type: "getBalance" }} AccountMessage
 */

/**
 * @typedef AccountState
 * @property {number} balance
 */

/**
 * @param {Actors.HandlerContext<number>} ctx
 * @param {AccountState} state
 * @param {AccountMessage} message
 * @returns {AccountState}
 */
function accountHandler(ctx, state, message) {
  switch (message.type) {
    case "deposit":
      if (message.amount <= 0) return state;
      return { ...state, balance: state.balance + message.amount };
    case "withdrawal":
      if (message.amount <= 0) return state;
      return { ...state, balance: state.balance - message.amount };
    case "getBalance":
      ctx.respondWith?.(state.balance);
  }

  return state;
}

const chequing = star.spawn(accountHandler, { balance: 8234.32 });
chequing.send({ amount: 50.4, type: "withdrawal" });

const savings = star.spawn(accountHandler, { balance: 1000 });
savings.send({ amount: 102, type: "deposit" });
savings.send({ amount: 12.74, type: "withdrawal" });
savings.send({ type: "getBalance" }, (balance) => {
  console.log(`💰 Savings account balance: ${c.bold.green(balance)}.`);
});
