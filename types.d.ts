declare namespace Actors {
  /**
   * An actor address is a string that starts with "Actor/" and is followed by
   * a unique, unguessable identifier. The address is used within an actor
   * node to send messages to said actor, retrieve the actor's current state,
   * manage the callbacks from others awaiting a response from the actor, etc.
   *
   * Considering its function within the actor node, and its function in code
   * literally, there's a nice symmetry in this commonality.
   */
  type ActorAddress = `Actor/${string}`;

  interface ActorHandle<AcceptedMessage, Reply> {
    /** The address of the actor referred to by this handle */
    address(): ActorAddress;

    /**
     * Send a message to the actor referred to by this handle. If you provide a
     * `replyTo`, the message handler of the actor will be offered a
     * `respondWith` function with which to reply directly to this message.
     *
     * This is generally useful for queries where the sent message is a query
     * and the reply is presumably the results of said query.
     */
    send(message: AcceptedMessage): void;
    send(message: AcceptedMessage, replyTo: (reply: Reply) => void): void;
  }

  /**
   * The actor {@link Node} gives you all the primitives needed to interact
   * all the actors in the node. You can send messages to actors and spawn new
   * actors.
   *
   * If you want to communicate with actors, check out {@link Node.send} or its
   * async variant supporting `replyTo` callbacks... Yes, the return of
   * callbacks. Nicer APIs can be provided with promises or async/await and
   * nothing prevents you from using async/await inside the actor's behaviour,
   * these simple callbacks are sufficient for all the basic communication
   * requirements:
   * - a way to send a message to an actor and go about your business
   * - a way to send a message to an actor and get/expect a reply.
   *
   * If you want to create new actors, check out {@link Node.spawn}.
   */
  interface Node {
    /**
     * Send `aMessage` to the actor at `to`. If `replyTo` is provided, the
     * actor at `to` will be able to reply to the message.
     */
    send(to: ActorAddress, aMessage: Record<string, unknown>): void;
    send(
      to: ActorAddress,
      aMessage: Record<string, unknown>,
      replyTo: (reply: any) => void,
    ): void;
    send(
      to: ActorAddress,
      aMessage: Record<string, unknown>,
      replyTo?: (reply: any) => void,
    ): void;

    /**
     * Spawn a _local_ actor with the given behaviour returning its
     * {@link ActorAddress}. With this, you can start sending messages!
     */
    spawn<AcceptedMessage extends Record<string, unknown>, Reply, State>(
      handler: (
        ctx: HandlerContext<Reply>,
        current: State,
        incoming: AcceptedMessage,
      ) => State | Promise<State>,
      initialState: State,
    ): ActorHandle<AcceptedMessage, Reply>;
  }

  interface NodeOptions {
    /**
     * A means of generating unique IDs for actors. If not provided, the
     * default node behavior is to generate UUIDs with `crypto.randomUUID`.
     */
    generateID(): string;

    /**
     * A collection of listeners that will be called for virtually every thing
     * that happens within the node. This is useful for logging, monitoring,
     * testing, etc.
     */
    listeners: Partial<NodeEventListeners>;
  }

  interface NodeEventListeners {
    onActorSpawned(newActor: ActorAddress): void;
    onActorStateChanged<State = unknown>(
      actor: ActorAddress,
      current: State,
      previous: State,
    ): void;
    onActorStatusChanged<Status extends string = string>(
      actor: ActorAddress,
      newStatus: Status,
    ): void;
    onActorMessageSent(sentMessage: unknown, sender: ActorAddress): void;
  }

  /**
   * The handler context represents the context during which an actor is
   * handling a message it received.
   */
  interface HandlerContext<Reply> {
    /**
     * If the sender of the message also provides a means of sending replies
     * (e.g. a sender address or callback), `respondWith` will exist and send a
     * reply at most once.
     */
    respondWith?(aReply: Reply): void;

    /**
     * The address of the current actor handling the current incoming message.
     */
    self(): ActorAddress;
  }

  type Handler<AcceptedMessage, Reply, State> = (
    ctx: HandlerContext<Reply>,
    current: State,
    incoming: AcceptedMessage,
  ) => State | Promise<State>;

  const enum Status {
    Idle = "idle",
    Processing = "processing",
    Waiting = "waiting",
  }
}
