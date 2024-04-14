# JS Actors

This is a simple library for creating actors in JavaScript. It is inspired by the actor model of computation, which is a model of concurrent computation that treats actors as the universal primitives of concurrent computation. In this model, actors are autonomous entities that communicate with each other by sending messages.

## Goals of this project

Can we get a _functioning_ actor model implementation in the browser? Can some of today's common web challenges be modeled by such an implementation? I'd like to try implementing a simple todo list application using actors and no framework. It's not clear if this will yield a useful example of an actor model in practice, but I expect it will be informative either way.

## Roadmap

- [ ] An actor can be spawned with a given message handler to process incoming messages
- [ ] An actor can send messages to another actor using its address
- [ ] An actor can receive messages and be sent messages
- [ ] Use the main event loop for scheduling actors, maybe using `requestAnimationFrame` or `setTimeout` or something
