// @ts-check

/// <reference path="./types.d.ts" />

/**
 * Create a new actor node. If you aren't providing any options, consider using
 * the default node exported from `actor. xjs` instead.
 *
 * @param {Partial<Actors.NodeOptions>} [options]
 * @returns {Actors.Node}
 */
function node(options) {
  function generateActorID() {
    if (typeof options?.generateID === "function") {
      return options.generateID();
    } else {
      return crypto.randomUUID();
    }
  }

  /** @param {Actors.ActorAddress} address */
  function enqueueActor(address) {
    const actor = actors.get(address);
    if (!actor) {
      console.warn(`No actor for address ${address}!`);
      return;
    }

    if (actor.status === Status.Waiting) return;

    setTimeout(async () => {
      const actor = actors.get(address);
      if (!actor) {
        console.warn(`No actor for address ${address}!`);
        return;
      }

      const nextMessage = actor.messages.shift();
      if (nextMessage === undefined) {
        console.debug(`No messages for actor ${address}.`);
        return;
      }

      const replyTo = replyTos.get(nextMessage);

      actor.status = Status.Processing;
      options?.listeners?.onActorStatusChanged?.(address, Status.Processing);

      const nextState = await actor.handler(
        {
          respondWith: typeof replyTo === "function" ? replyTo : undefined,
          self() {
            return address;
          },
        },
        actor.state,
        nextMessage,
      );
      replyTos.delete(nextMessage);

      if (actor.state !== nextState) {
        const previousState = actor.state;
        actor.state = nextState;
        options?.listeners?.onActorStateChanged?.(
          address,
          nextState,
          previousState,
        );
      }

      if (actor.messages.length === 0) {
        actor.status = Status.Idle;
        options?.listeners?.onActorStatusChanged?.(address, Status.Idle);
        return;
      }

      return enqueueActor(address);
    }, 0);

    actor.status = Status.Waiting;
    options?.listeners?.onActorStatusChanged?.(address, Status.Waiting);
  }

  /** @type {Map<Actors.ActorAddress, Actor<any, any, any>>} */
  const actors = new Map();

  /** @type {WeakMap<Record<string, unknown>, (aReply: unknown) => void>} */
  const replyTos = new WeakMap();

  /** @type {Actors.Node} */
  const self = {
    send(to, aMessage, replyTo) {
      const actor = actors.get(to);
      if (!actor) {
        console.warn(`No actor for address ${to}!`);
        return;
      }

      actor.messages.push(aMessage);
      if (typeof replyTo === "function") {
        replyTos.set(aMessage, replyTo);
      }
      options?.listeners?.onActorMessageSent?.(aMessage, to);

      if (actor.messages.length > 0) {
        enqueueActor(to);
      }
    },

    /**
     * @template {Record<string, unknown>} AcceptedMessage
     * @template Reply
     * @template State
     * @param {(ctx: Actors.HandlerContext<Reply>, current: State, incoming: AcceptedMessage) => State | Promise<State>} handler The behaviour of the actor to spawn
     * @param {State} initialState
     * @returns {ActorHandle<AcceptedMessage, Reply>}
     */
    spawn(handler, initialState) {
      // Create a new Actor ID
      const actorID = generateActorID();

      actors.set(`Actor/${actorID}`, {
        handler,
        messages: [],
        state: initialState,
        status: Status.Idle,
      });

      const handle = new ActorHandle(actorID, self);
      options?.listeners?.onActorSpawned?.(handle.address());
      return handle;
    },
  };

  return self;
}

/** @type {Actors.Node} */
const defaultNode = Object.freeze(node());

/**
 * An actor handle is a convenience for sending messages to a specific actor
 * without needing to provide the address of the actor every time.
 *
 * @template {Record<string, unknown>} AcceptedMessage
 * @template Reply
 * @implements {Actors.ActorHandle<AcceptedMessage, Reply>}
 */
class ActorHandle {
  /** @type {string} */
  #actorID;

  /** @type {Actors.Node} */
  #node;

  /**
   * @param {string} actorID
   * @param {Actors.Node} node
   */
  constructor(actorID, node) {
    this.#actorID = actorID;
    this.#node = node;
  }

  /** @returns {Actors.ActorAddress} */
  address() {
    return `Actor/${this.#actorID}`;
  }

  /**
   * @param {AcceptedMessage} aMessage
   * @param {(aReply: Reply) => void} [replyTo]
   * @returns {void}
   */
  send(aMessage, replyTo) {
    this.#node.send(this.address(), aMessage, replyTo);
  }
}

/**
 * @template {Record<string, unknown>} AcceptedMessage
 * @template Reply
 * @template State
 * @typedef Actor
 * @property {Actors.Handler<AcceptedMessage, Reply, State>} handler
 * @property {Array<AcceptedMessage>} messages
 * @property {State} state
 * @property {Status} status
 */

const Status = Object.freeze({
  /**
   * An actor is idle when it has no messages in its mailbox and has it not
   * awaiting a turn from theh scheduler.
   */
  Idle: "idle",

  /**
   * An actor is processing when it is actively processing a message. The
   * status is _processing_ right before the actor's message handler is
   * invoked and exits _processing_ immediately after.
   */
  Processing: "processing",

  /**
   * An actor is waiting when it has messages in it has been enqueued with the
   * scheduler to process a message.
   */
  Waiting: "waiting",
});
/** @typedef {(typeof Status)[keyof typeof Status]} Status */

export { ActorHandle, defaultNode, defaultNode as default, node, Status };
