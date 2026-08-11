'use strict';

const ARCH_DESCRIPTIONS = {
  layered: 'Controller → Service → Repository. Simple, familiar. Best for CRUD APIs and small teams.',
  clean: 'Framework-free core. Adapters depend inward. Best when you may swap frameworks later.',
  hexagonal: 'Domain depends on nothing. Ports isolate infrastructure. Best for complex business rules.',
  onion: 'Domain at center, services wrap around. Dependencies flow inward only.',
  mvc: 'Model-View-Controller. Classic server-rendered pattern.',
  'modular-monolith': 'Independent modules with public interfaces. Enforced boundaries within one deployable.',
  'vertical-slice': 'One folder per use-case. Cuts through every layer. Best for feature teams.',
  cqrs: 'Separate read and write paths. Optimizes each independently.',
  'event-driven': 'Events as first-class citizens. Event store, projections, outbox pattern.',
  serverless: 'Handler per function. Pay-per-use. AWS Lambda / Cloudflare Workers.',
  microservices: 'Independent services. Own data store per service. Docker orchestration.',
};

function getArchDescription(value) {
  if (!value) return null;
  return ARCH_DESCRIPTIONS[value] || null;
}

function getArchTitle(value) {
  const titles = {
    layered: 'Layered Architecture',
    clean: 'Clean Architecture',
    hexagonal: 'Hexagonal (Ports & Adapters)',
    onion: 'Onion Architecture',
    mvc: 'Model-View-Controller',
    'modular-monolith': 'Modular Monolith',
    'vertical-slice': 'Vertical Slice',
    cqrs: 'Command Query Responsibility Segregation',
    'event-driven': 'Event-Driven Architecture',
    serverless: 'Serverless',
    microservices: 'Microservices',
  };
  return (value && titles[value]) || null;
}

module.exports = { ARCH_DESCRIPTIONS, getArchDescription, getArchTitle };
