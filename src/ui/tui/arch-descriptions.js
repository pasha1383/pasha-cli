'use strict';

module.exports = {
  layered: {
    title: 'Layered (N-Tier)',
    description: 'The codebase is split into horizontal layers — typically Controller/Presentation, Service/Application, and Repository/Data. Each layer only calls the one directly below it. Dependencies flow top-to-bottom; data flows both ways. Simple mental model, fast onboarding, and trivial to test each layer in isolation with mocks. The trade-off: business logic tends to accumulate in fat services, and layer boundaries blur over time unless enforced by lint rules or architecture tests.',
    bestFor: 'CRUD APIs, internal tools, small-to-medium teams, rapid prototyping',
    files: 'src/{controllers, services, repositories, models, dto}/',
  },
  clean: {
    title: 'Clean Architecture',
    description: 'A dependency-inversion approach where the innermost circle — Entities and Use Cases — has zero framework imports. Adapters (controllers, repositories, presenters) depend inward on the core via interfaces (ports). You can swap Express for Fastify or PostgreSQL for MongoDB without touching business rules. I/O and side effects exist only in the outer ring. The cost is more boilerplate: DTOs, mappers, and interface definitions for every boundary.',
    bestFor: 'Framework migrations, strict separation of concerns, large teams, long-lived projects',
    files: 'core/{entities, use-cases, ports} + adapters/{controllers, repositories, presenters}',
  },
  hexagonal: {
    title: 'Hexagonal (Ports & Adapters) / DDD',
    description: 'The domain model is the star of the show — it has no framework or database imports. "Ports" are interfaces that define what the domain needs (e.g. an OrderRepository port). "Adapters" implement those ports (e.g. a PostgresOrderRepository). External systems only ever talk through ports. Domain objects enforce invariants with constructors and methods, not setters. Unit-testing the domain is pure and fast. Ideal when business complexity dominates technical complexity.',
    bestFor: 'Complex business rules, domain-driven teams, projects where the domain outlives the UI',
    files: 'domain/ (zero framework imports) + application/ (ports, use-cases) + infrastructure/ (adapters)',
  },
  onion: {
    title: 'Onion Architecture',
    description: 'All dependencies point toward the centre. The Domain layer sits at the core. Around it is the Application layer (use-cases, interfaces). Around that is the Infrastructure layer (database, HTTP, message queues). At the outermost ring is the Presentation/UI layer. Any outer ring can depend on any inner ring, but never the reverse. This gives maximum flexibility to swap infrastructure without touching core logic.',
    bestFor: 'Contract-driven development, projects where technology choices may change over time',
    files: 'src/{domain, application, infrastructure, presentation}/',
  },
  mvc: {
    title: 'Model-View-Controller (MVC)',
    description: 'The classic web pattern. Controllers accept requests and return responses. Models hold data and business logic. Views render the output. In server-rendered apps (Rails, Django, Laravel, Adonis) the View layer produces HTML. In API-only MVC frameworks the View is often replaced by serialisers or omitted entirely. Simple, well-understood, and backed by decades of tooling. Best for monoliths where convention-over-configuration matters.',
    bestFor: 'Full-stack monoliths with server-side rendering, convention-heavy teams, rapid iteration',
    files: 'app/{controllers, models, views}/ — or src/{controllers, models, routes}/',
  },
  modular: {
    title: 'Modular Monolith',
    description: 'A single deployable process partitioned into modules (or packages) that own their domain end-to-end. Each module has its own controllers, services, and persistence — modules do not share database tables directly. Communication between modules happens through public interfaces or lightweight events. You get the simplicity of a monolith with the isolation of microservices, without distributed-systems pain. A common first step before breaking into microservices.',
    bestFor: 'Teams that want microservice-like isolation without operational overhead, growing projects',
    files: 'modules/{users, orders, payments}/ — each module is self-contained',
  },
  vertical: {
    title: 'Vertical Slice Architecture',
    description: 'Each feature is implemented in a single vertical slice that spans the full stack. Instead of separate controller, service, and repository layers, a single "CreateOrder" folder contains the HTTP handler, validation, business logic, and data access for that one feature. Adding a feature means adding one folder. Changing a feature rarely touches unrelated code. Maximises cohesion and minimises coupling between features.',
    bestFor: 'Feature-centric teams, rapid feature delivery, reducing merge conflicts in large teams',
    files: 'features/{create-order, list-products, authenticate}/ — each slice is self-contained',
  },
  cqrs: {
    title: 'CQRS (Command-Query Responsibility Segregation)',
    description: 'Commands (writes) and Queries (reads) use separate models and often separate data stores. A command handler validates and persists changes; a query handler reads from optimised projections. This lets you scale reads independently from writes and choose the best persistence for each. Often paired with Event Sourcing, where the event store is the single source of truth and projections are rebuilt from events. Adds significant complexity — only reach for it when reads and writes have drastically different shapes or scale requirements.',
    bestFor: 'High read/write asymmetry, event-sourced systems, complex query requirements',
    files: 'src/{commands, queries, events, projections, aggregates}/',
  },
  'event-driven': {
    title: 'Event-Driven / Event Sourcing',
    description: 'Services communicate through events, not direct API calls. Each service emits domain events ("OrderPlaced", "PaymentReceived") to a message bus or event log. Other services subscribe and react. The event store becomes the authoritative source of truth — current state is a projection of the full event history. This gives you an audit log for free and makes temporal queries trivial ("what did the order look like last Tuesday?"). At small scale the event bus and eventual-consistency model is overkill.',
    bestFor: 'Workflow-heavy systems, audit trails, eventual-consistency acceptable, microservice communication',
    files: 'src/{events, handlers, projections, event-store}/',
  },
  serverless: {
    title: 'Serverless / Function-as-a-Service',
    description: 'Logic is deployed as individual functions (AWS Lambda, Cloudflare Workers, Vercel Functions). Each function handles one API endpoint or one event type. No long-running server to manage — you pay only for invocation time. Cold starts are the main trade-off; keep functions small and avoid heavy frameworks. State must live in external services (DynamoDB, S3, Redis). Best when traffic is spiky or unpredictable.',
    bestFor: 'Spiky workloads, event processing, API gateways, cost-sensitive projects with variable traffic',
    files: 'src/functions/{createUser, getOrder, processPayment}/ + shared/',
  },
  microservices: {
    title: 'Microservices',
    description: 'The application is split into independently deployable services, each owning a bounded context. Services communicate over the network — typically via REST, gRPC, or async messaging. Each service can use its own language, framework, and database. You can scale hot services independently and deploy without coordinating across the whole org. The operational cost is high: service discovery, distributed tracing, circuit breakers, and eventual consistency all add friction. Start with a modular monolith unless you have strong organisational reasons to distribute.',
    bestFor: 'Large organisations with independent teams, systems needing independent scaling, polyglot stacks',
    files: 'services/{user-service, order-service, payment-service}/ — each is its own project',
  },
  'component-based': {
    title: 'Component-Based Architecture',
    description: 'The UI is built from reusable, composable components — buttons, cards, modals, forms. Each component encapsulates its own markup, styles, and behaviour. Components can be composed into larger patterns: molecules (search bar with button), organisms (page header with nav), and pages. This is the baseline architecture for React, Vue, Svelte, and most modern frontend frameworks. Simple, scalable, and well-understood by most developers.',
    bestFor: 'Most frontend apps, component libraries, design systems, teams new to frontend architecture',
    files: 'src/{components, hooks, utils, pages}/',
  },
  'feature-sliced': {
    title: 'Feature-Sliced Design',
    description: 'The codebase is organised by business features, not technical categories. Each feature folder (e.g. "auth", "profile", "search") owns its UI, data-fetching, state, and types. Shared code lives in a "shared" layer. Widgets compose features into larger blocks. Pages assemble widgets into routes. This makes it obvious where to put new code and prevents cross-feature coupling. Popular in the React/Next.js community.',
    bestFor: 'Medium-to-large frontend codebases, teams working on distinct features, reducing coupling',
    files: 'src/{pages, widgets, features, entities, shared}/',
  },
  'atomic-design': {
    title: 'Atomic Design',
    description: 'Components are categorised into five levels: Atoms (buttons, inputs, labels), Molecules (search bar = input + button), Organisms (page header = logo + nav), Templates (page layouts without real content), and Pages (templates with real data). This creates a strict component hierarchy and a natural design-system workflow. Works well when designers and developers share vocabulary. Can be overly formal for small projects.',
    bestFor: 'Design systems, projects with dedicated UI designers, component libraries shared across multiple apps',
    files: 'src/{atoms, molecules, organisms, templates, pages}/',
  },
  'page-based': {
    title: 'Page-Based Routing',
    description: 'File-system routing where each file under a pages or routes directory becomes a URL. The framework handles code-splitting, layouts, and navigation automatically. Components, hooks, and utilities live in parallel directories. Simple and intuitive — you can guess the URL by looking at the file tree. Works out of the box with Next.js Pages Router, SvelteKit, Astro, and Nuxt.',
    bestFor: 'Content sites, marketing pages, documentation, any project with URL-driven structure',
    files: 'pages/ or routes/ + components/, hooks/, utils/',
  },
  'app-router': {
    title: 'App Router (React Server Components)',
    description: 'Next.js App Router architecture built around React Server Components. Layouts, pages, and loading/error states are co-located in the app/ directory. Server Components fetch data directly — no client-side API layer needed for most reads. Client Components are opt-in with the "use client" directive. Streaming, Suspense boundaries, and partial prerendering are first-class citizens.',
    bestFor: 'Next.js 13+ projects, apps that benefit from server-side rendering, streaming, and reduced client JS',
    files: 'app/{layout.tsx, page.tsx, loading.tsx, error.tsx}/ + components/',
  },
  'island-architecture': {
    title: 'Islands Architecture',
    description: 'The page is rendered as static HTML on the server. Interactive "islands" of JavaScript are hydrated on the client only where needed — a carousel, a search input, a shopping cart. The rest of the page stays as zero-JS HTML. Pioneered by Astro and increasingly adopted by frameworks optimising for Core Web Vitals. Minimises JavaScript shipped to the browser.',
    bestFor: 'Content-heavy sites with isolated interactivity, marketing sites, performance-focused projects',
    files: 'src/{components (server), islands (client), layouts, pages}/',
  },
  'redux-toolkit': {
    title: 'Redux Toolkit (State-Management-First)',
    description: 'Architecture centred around a Redux store. Slices define reducer logic and actions. Selectors extract derived data. Components dispatch actions and subscribe to store changes via hooks. RTK Query handles API caching and invalidation. Best when the app has complex shared state that many components need — shopping carts, multi-step forms, real-time dashboards. Overkill for simple data-fetching apps.',
    bestFor: 'Apps with complex client-side state, real-time updates, multi-step workflows',
    files: 'src/{store (slices, selectors), components, hooks, api}/',
  },
  'pinia-store': {
    title: 'Pinia Store-Based',
    description: 'Vue 3 architecture organised around Pinia stores — the official state management library. Each store owns a domain (auth, cart, products) with state, getters (computed), and actions (async or sync). Components remain thin views that delegate logic to stores. Simpler, more composable, and better TypeScript support than Vuex. Scales well for medium-to-large SPAs.',
    bestFor: 'Vue 3 SPAs with shared state, multi-view workflows, apps transitioning from Vuex',
    files: 'src/{stores, views, composables, components}/',
  },
  'feature-modules': {
    title: 'Angular Feature Modules (NgModules)',
    description: 'Each feature is encapsulated in an NgModule — a logical grouping of components, services, directives, and pipes. Modules can be eagerly or lazily loaded at routes. Shared modules provide common UI and utilities. Core module holds singleton services. This is the traditional Angular architecture, well-suited for enterprise apps with many distinct domains.',
    bestFor: 'Enterprise Angular apps, large codebases with clear domain boundaries, lazy-loaded routes',
    files: 'src/app/{feature-modules, shared, core}/',
  },
  ngrx: {
    title: 'NgRx (Angular State Management)',
    description: 'Angular architecture using NgRx for state management — the Redux pattern ported to Angular with RxJS. Actions, reducers, selectors, and effects create a unidirectional data flow. The Store is the single source of truth. Effects handle side effects (API calls, navigation). Best for large Angular apps with complex, shared state where plain services become unwieldy.',
    bestFor: 'Large Angular apps, complex state machines, teams familiar with Redux patterns',
    files: 'src/app/{store (actions, reducers, selectors, effects), components, services}/',
  },
  'content-site': {
    title: 'Content-Focused Site',
    description: 'Astro architecture optimised for content — blogs, documentation, portfolios. Pages are .astro or .md/.mdx files in the pages directory. Components are server-rendered by default. Interactive islands are opt-in. Content collections provide type-safe frontmatter. Lightning-fast static output with hydration only where necessary.',
    bestFor: 'Blogs, docs sites, portfolios, any content-heavy website',
    files: 'src/{content (collections), pages, components, layouts}/',
  },
  'kit-routes': {
    title: 'SvelteKit File-Based Routing',
    description: 'SvelteKit architecture with file-system routing — +page.svelte, +layout.svelte, +page.server.js, +server.js. Server-side load functions fetch data in the same file as the page component. Form actions handle mutations. Zero-API layer for most pages. Adaptable to different deployment targets (Node, Vercel, Cloudflare, static).',
    bestFor: 'Svelte apps, full-stack projects where co-locating data fetching with components is desired',
    files: 'src/routes/{+page.svelte, +page.server.js, +layout.svelte}/ + lib/',
  },
  tailwind: {
    title: 'Tailwind CSS (Utility-First)',
    description: 'A single HTML file with Tailwind CSS loaded via CDN. No build step, no JavaScript framework, no npm. Styles are applied through utility classes directly in the HTML markup. Perfect for rapid prototyping, landing pages, and static sites that need to look polished without tooling overhead. Add Alpine.js or HTMX for light interactivity.',
    bestFor: 'Landing pages, prototypes, static sites, educational projects, rapid experiments',
    files: 'index.html + optionally components/ as separate HTML files',
  },
  bootstrap: {
    title: 'Bootstrap 5 (Component Library)',
    description: 'A single HTML file with Bootstrap 5 CSS/JS loaded via CDN. Pre-built components — navbar, cards, modals, forms, carousels — are available as CSS classes. Faster than Tailwind for UI-heavy pages because components already exist. Includes a responsive grid system out of the box. Less customisable than utility-first approaches but faster to ship.',
    bestFor: 'Admin panels, dashboards, prototypes, projects where speed of development trumps custom design',
    files: 'index.html + optionally pages/ folders for multi-page sites',
  },
  'landing-page': {
    title: 'Landing Page (Hero, Features, Pricing, CTA)',
    description: 'A self-contained single-page HTML file organised into sections: hero banner, features grid, testimonials, pricing table, call-to-action, footer. Each section is a semantic <section> with a clear id. Smooth scroll navigation connects the nav links to sections. Includes basic CSS animations and mobile-responsive breakpoints. Ready to deploy as-is.',
    bestFor: 'Product landing pages, marketing sites, project showcases, single-serve websites',
    files: 'index.html (single file with all sections inline)',
  },
  dashboard: {
    title: 'Dashboard (Sidebar, Cards, Charts, Table)',
    description: 'A multi-section dashboard with a fixed sidebar navigation, header bar, stat cards with KPI numbers, a chart area (Chart.js via CDN), and a data table with sorting. Built to be data-dense and functional from the start. Responsive — sidebar collapses to a hamburger menu on mobile. Cards display live stats; table supports sorting by column; chart is interactive.',
    bestFor: 'Admin panels, analytics dashboards, internal tools, monitoring screens',
    files: 'index.html (monolithic dashboard) or split into sections/js/ subdirectories',
  },
  function: {
    title: 'Handler-per-Function (FaaS)',
    description: 'Each cloud function (Lambda, Worker, Cloud Function) lives in its own file with a single exported handler. The handler receives the event, parses and validates input, delegates to pure business logic in a shared library, and returns a response or throws. No long-running HTTP server — the platform runtime calls your handler per-invocation. Shared code (validation, database access, utilities) sits in a `lib/` or `shared/` directory, imported by each function as needed. Cold-start latency is the primary constraint: functions stay small, imports are kept minimal, and heavy frameworks are avoided. Each function is independently deployable and automatically scales to zero when idle. Distinct from framework-level serverless (e.g. NestJS wrapping Express behind a Lambda adapter), this pattern embraces the raw FaaS contract directly.',
    bestFor: 'Micro-services with spiky traffic, event-driven pipelines, API gateways, cost-sensitive serverless deployments',
    files: 'functions/{createUser, getOrder, processPayment}/ + shared/lib/',
  },

  // ── Languages ──────────────────────────────────────────────

  go: {
    title: 'Go',
    description: 'Compiled, statically typed systems language by Google. Fast compile times, goroutines for lightweight concurrency, and single-binary deploys. Excellent standard library and growing cloud-native ecosystem.',
    bestFor: 'High-performance APIs, microservices, CLI tools, cloud-native apps',
    files: '\u2022 gin — Fast, featureful HTTP framework\n\u2022 echo — Minimalist, high-performance\n\u2022 fiber — Express-inspired, fasthttp-based\n\u2022 chi — Idiomatic, composable, lightweight\n\u2022 stdlib — net/http, zero dependencies',
  },
  java: {
    title: 'Java',
    description: 'Mature, statically typed JVM language with a vast enterprise ecosystem. Strong typing, battle-tested performance, and excellent tooling (IntelliJ, Maven, Gradle). Spring Boot dominates the web landscape.',
    bestFor: 'Enterprise apps, banking/finance, large teams, complex business logic',
    files: '\u2022 spring-boot — Comprehensive, auto-configuration, production-ready',
  },
  node: {
    title: 'Node.js / TypeScript',
    description: 'JavaScript runtime with optional TypeScript for type safety. Single language across frontend and backend. Massive npm ecosystem with 2M+ packages. Non-blocking I/O for high concurrency.',
    bestFor: 'Full-stack apps, real-time services, rapid prototyping, REST/GraphQL APIs',
    files: '\u2022 nestjs — Opinionated, Angular-inspired, modular\n\u2022 express — Minimal, unopinionated, middleware-based\n\u2022 fastify — Fast, schema-first, plugin architecture\n\u2022 koa — Async/await, lightweight, composable\n\u2022 hapi — Configuration-driven, enterprise-grade\n\u2022 adonis — Full-stack MVC, Laravel-inspired\n\u2022 serverless — AWS Lambda / Cloudflare Workers\n\u2022 microservices — Multi-service distributed system',
  },
  python: {
    title: 'Python',
    description: 'General-purpose, readable language. Excellent for data science, web backends, and APIs. Rich ecosystem for scientific computing, machine learning, and automation.',
    bestFor: 'Data-heavy APIs, ML integration, rapid development, scripting',
    files: '\u2022 django — Full-stack with admin, ORM, auth\n\u2022 fastapi — Modern async, auto-docs, Pydantic\n\u2022 flask — Minimal, flexible, great for APIs\n\u2022 litestar — Fast, typed, OpenAPI-native\n\u2022 tornado — Async, real-time web apps',
  },
  ruby: {
    title: 'Ruby',
    description: 'Elegant, developer-friendly language designed for programmer happiness. Convention over configuration philosophy. Known for readable syntax and rapid development speed.',
    bestFor: 'Rapid prototyping, startups, convention-heavy teams, SaaS apps',
    files: '\u2022 rails — Full-stack MVC, batteries included, mature ecosystem',
  },
  php: {
    title: 'PHP',
    description: 'Battle-tested server-side language powering over 75% of the web. Low barrier to entry, massive hosting support, and fast request/response lifecycle. Modern PHP is typed and performant.',
    bestFor: 'Web apps, CMS-driven sites, quick deployment, shared hosting',
    files: '\u2022 laravel — Elegant syntax, Artisan CLI, Eloquent ORM, rich ecosystem',
  },
  csharp: {
    title: 'C# / .NET',
    description: 'Cross-platform, statically typed language by Microsoft. Modern features: async/await, LINQ, pattern matching. First-class tooling with Visual Studio and JetBrains Rider.',
    bestFor: 'Enterprise apps, Windows ecosystem, game dev (Unity), large-scale services',
    files: '\u2022 aspnet — High-performance, dependency injection, minimal APIs',
  },
  rust: {
    title: 'Rust',
    description: 'Systems programming language with zero-cost abstractions and memory safety without garbage collection. Blazing fast execution and fearless concurrency. Steep learning curve but unmatched runtime guarantees.',
    bestFor: 'Performance-critical systems, high-throughput APIs, embedded, WASM',
    files: '\u2022 axum — Ergonomic, tower-based, async-first web framework',
  },
  frontend: {
    title: 'Frontend',
    description: 'Browser-side applications built with modern JavaScript frameworks. Component-based UI, client-side routing, state management, and build tooling. Ships to browsers as HTML, CSS, and JS bundles.',
    bestFor: 'SPAs, dashboards, design systems, interactive UIs, Jamstack sites',
    files: '\u2022 nextjs — React framework, SSR/SSG, App Router\n\u2022 react — Vite SPA, component-based, hooks\n\u2022 vue — Vite SPA, Composition API, reactive\n\u2022 svelte — Compiled framework, minimal runtime, SvelteKit\n\u2022 angular — Full-featured, TypeScript, RxJS\n\u2022 astro — Content-focused, islands, zero JS by default',
  },
  html: {
    title: 'HTML5 / CSS3 / JavaScript',
    description: 'Vanilla web technologies with zero build step, no npm, no framework. Use utility CSS (Tailwind) or component libraries (Bootstrap) via CDN. Add interactivity with vanilla JS, Alpine.js, or HTMX.',
    bestFor: 'Static sites, landing pages, prototypes, minimal tooling projects',
    files: '\u2022 tailwind — Utility-first CSS, rapid UI via classes\n\u2022 bootstrap — Pre-built components, responsive grid\n\u2022 web-components — Native custom elements\n\u2022 landing-page — Single-page marketing site\n\u2022 dashboard — Admin panel with charts and tables',
  },

  // ── Frameworks ─────────────────────────────────────────────

  // Node.js
  nestjs: {
    title: 'NestJS',
    description: 'Opinionated TypeScript framework built on Express/Fastify with an Angular-inspired module system. Decorators for controllers, providers, guards, pipes, and interceptors. Built-in support for GraphQL, WebSockets, and microservices.',
    bestFor: 'Enterprise Node.js apps, complex APIs, teams familiar with Angular, GraphQL servers',
    files: 'Controllers, Providers, Modules, Guards, Pipes, Interceptors',
  },
  express: {
    title: 'Express',
    description: 'Minimalist, unopinionated Node.js web framework. Middleware-based request pipeline with vast plugin ecosystem for auth, logging, CORS, and body parsing. The most popular Node.js framework.',
    bestFor: 'REST APIs, microservices, rapid prototyping, middleware-heavy apps',
    files: 'Routes, Middleware, Controllers, Services, Repositories',
  },
  fastify: {
    title: 'Fastify',
    description: 'High-performance Node.js framework focused on speed and low overhead. Schema-based request/response validation with JSON Schema. Plugin architecture with encapsulation. Automatic Swagger/OpenAPI generation.',
    bestFor: 'Performance-sensitive APIs, schema-driven development, microservices',
    files: 'Plugins, Routes, Schemas, Decorators, Hooks',
  },
  koa: {
    title: 'Koa',
    description: 'Lightweight, modern Node.js framework by the Express team. Uses async/await instead of callbacks for middleware. Minimal core — no bundled middleware or routing. You compose the stack you need.',
    bestFor: 'Minimalist APIs, developers who want full control, lightweight services',
    files: 'Middleware, Context, Routes, Services, Repositories',
  },
  hapi: {
    title: 'Hapi',
    description: 'Configuration-driven, enterprise-grade Node.js framework. Declarative route configuration with built-in input validation (Joi), caching, and authentication. Plugin-based architecture for modular decomposition.',
    bestFor: 'Enterprise APIs, configuration-heavy teams, large plugin ecosystems',
    files: 'Routes, Plugins, Services, Validators, Repositories',
  },
  adonis: {
    title: 'AdonisJS',
    description: 'Full-stack Node.js MVC framework inspired by Laravel. Ships with ORM (Lucid), auth, migrations, templating (Edge), and a powerful CLI. Convention over configuration. Batteries included for web applications.',
    bestFor: 'Full-stack monoliths, Laravel developers moving to Node, convention-driven teams',
    files: 'Controllers, Models, Services, Views, Middleware',
  },

  // Python
  django: {
    title: 'Django',
    description: 'Full-stack Python web framework with batteries included. Built-in ORM, admin interface, authentication, forms, and templating. Follows convention over configuration. Mature and battle-tested.',
    bestFor: 'Full-stack monoliths, admin-heavy apps, rapid prototyping with built-in admin',
    files: 'Models, Views, Templates, Forms, Admin, URLs',
  },
  fastapi: {
    title: 'FastAPI',
    description: 'Modern async Python web framework built on Starlette and Pydantic. Automatic OpenAPI/Swagger docs from type hints. First-class async support. Fastest Python web framework by requests-per-second.',
    bestFor: 'REST APIs, async microservices, OpenAPI-driven development, ML serving',
    files: 'Routers, Services, Repositories, DTOs (Pydantic models)',
  },
  flask: {
    title: 'Flask',
    description: 'Minimalist, unopinionated Python micro-framework. Simple routing with decorators. No ORM or form validation built in — choose your tools. Jinja2 templating bundled. Lightweight and flexible.',
    bestFor: 'Small APIs, microservices, prototyping, apps where simplicity matters',
    files: 'Blueprints, Views, Services, Repositories',
  },
  litestar: {
    title: 'Litestar',
    description: 'Modern, typed Python web framework with first-class async support. OpenAPI-native with automatic docs. Plugin system, dependency injection, and layered architecture out of the box. Growing ecosystem.',
    bestFor: 'Type-driven Python APIs, async services, OpenAPI-first teams',
    files: 'Controllers, Services, Repositories, DTOs',
  },
  tornado: {
    title: 'Tornado',
    description: 'Python web framework and asynchronous networking library. Built on an event loop for thousands of concurrent connections. Non-blocking I/O for real-time web features and long-lived connections.',
    bestFor: 'WebSockets, long-polling, real-time apps, async networking in Python',
    files: 'Handlers, Services, Repositories, WebSocket handlers',
  },

  // Go
  gin: {
    title: 'Gin',
    description: 'High-performance Go HTTP framework with a Martini-like API. Built-in request validation, JSON rendering, error management, and middleware support. The most popular Go web framework.',
    bestFor: 'REST APIs, microservices, high-throughput Go backends',
    files: 'Handlers, Services, Repositories, Middleware, DTOs',
  },
  echo: {
    title: 'Echo',
    description: 'Minimalist, high-performance Go web framework. Fast HTTP router with zero dynamic memory allocation. Built-in middleware for CORS, JWT, logging, and recovery. Clean API with context-based request handling.',
    bestFor: 'Performance-focused Go APIs, microservices, lightweight backend services',
    files: 'Handlers, Services, Repositories, Middleware, DTOs',
  },
  fiber: {
    title: 'Fiber',
    description: 'Express-inspired Go web framework built on fasthttp. Ultra-low memory footprint and high throughput. Familiar API for Node.js developers transitioning to Go. Strong middleware ecosystem.',
    bestFor: 'Go developers coming from Express, high-performance APIs, microservices',
    files: 'Handlers, Services, Repositories, Middleware, DTOs',
  },
  chi: {
    title: 'Chi',
    description: 'Idiomatic, composable Go HTTP router built on net/http. No external dependencies. Middleware stack fully compatible with standard library handlers. Lightweight and follows Go conventions closely.',
    bestFor: 'Stdlib-compatible Go APIs, composable middleware, lightweight routing',
    files: 'Handlers, Services, Repositories, Middleware, DTOs',
  },
  stdlib: {
    title: 'net/http (stdlib)',
    description: 'Go\'s built-in HTTP package — no third-party dependencies. Standard library ServeMux with middleware pattern. Zero external dependencies means zero supply-chain risk. Pragmatic and battle-tested.',
    bestFor: 'Minimal-dependency projects, simple APIs, maximum control, stdlib purists',
    files: 'Handlers, Services, Repositories, Middleware, DTOs',
  },

  // Java
  'spring-boot': {
    title: 'Spring Boot',
    description: 'Comprehensive Java framework with auto-configuration, embedded servers, and production-ready features. Dependency injection, AOP, and vast ecosystem (Spring Data, Security, Cloud).',
    bestFor: 'Enterprise Java apps, microservices, cloud-native Spring ecosystem, complex systems',
    files: 'Controllers, Services, Repositories, Entities, DTOs, Config',
  },

  // Ruby
  rails: {
    title: 'Ruby on Rails',
    description: 'Full-stack MVC web framework with convention over configuration. Built-in ORM (Active Record), migrations, mailers, WebSockets (Action Cable), and asset pipeline. Mature 20+ year ecosystem.',
    bestFor: 'Full-stack monoliths, rapid prototyping, SaaS apps, startups',
    files: 'Controllers, Models, Views, Helpers, Migrations, Services',
  },

  // PHP
  laravel: {
    title: 'Laravel',
    description: 'Elegant PHP web framework with expressive syntax. Built-in ORM (Eloquent), migrations, queues, WebSockets, and Artisan CLI. Rich ecosystem with Forge, Vapor, and Nova.',
    bestFor: 'Full-stack PHP apps, CMS-driven sites, rapid prototyping, artisan teams',
    files: 'Controllers, Models, Views, Middleware, Services, Jobs',
  },

  // C# / .NET
  aspnet: {
    title: 'ASP.NET Core',
    description: 'Cross-platform, high-performance .NET web framework. Minimal APIs for lightweight endpoints, controllers for MVC patterns. Built-in DI, middleware pipeline, and Entity Framework support.',
    bestFor: 'Enterprise .NET apps, high-performance APIs, Windows/Linux cloud services',
    files: 'Controllers, Services, Repositories, Entities, DTOs, Middleware',
  },

  // Rust
  axum: {
    title: 'Axum',
    description: 'Ergonomic Rust web framework built on Tokio and Tower. Type-safe extractors for request parsing. Middleware via Tower layers. Async-first with zero-cost abstractions. The leading Rust web framework.',
    bestFor: 'High-performance Rust APIs, type-safe web services, async Rust projects',
    files: 'Handlers, Services, Repositories, Entities, DTOs',
  },

  // Frontend
  nextjs: {
    title: 'Next.js',
    description: 'React meta-framework with SSR, SSG, and the App Router. React Server Components reduce client-side JS. Built-in routing, image optimization, API routes, and middleware.',
    bestFor: 'Production React apps, SEO-critical sites, full-stack React, e-commerce',
    files: 'app/ (layouts, pages, components) + lib/ + public/',
  },
  react: {
    title: 'React (Vite SPA)',
    description: 'Component-based UI library with hooks for state and effects. Vite provides fast HMR and optimized builds. Client-side routing via React Router. The de facto standard for interactive UIs.',
    bestFor: 'Interactive SPAs, dashboards, design systems, component libraries',
    files: 'src/components/ + hooks/ + utils/ + pages/',
  },
  vue: {
    title: 'Vue 3 (Vite SPA)',
    description: 'Approachable, performant UI framework with Composition API. Reactive state with ref() and reactive(). Single-file components with template, script, and style. Pinia for state management.',
    bestFor: 'Progressive web apps, SPAs, teams wanting simplicity with power',
    files: 'src/components/ + composables/ + views/ + stores/',
  },
  svelte: {
    title: 'Svelte',
    description: 'Compiler-first UI framework — components become vanilla JS at build time. No virtual DOM, minimal runtime. SvelteKit adds file-system routing, SSR, and API endpoints. Runes API in Svelte 5.',
    bestFor: 'Performance-first SPAs, apps with minimal bundle size, SvelteKit full-stack',
    files: 'src/routes/ + lib/ + components/ + stores/',
  },
  angular: {
    title: 'Angular',
    description: 'Full-featured, opinionated TypeScript framework with dependency injection, RxJS, and two-way binding. Standalone components in v17+. Signals for reactive state. Comprehensive CLI tooling.',
    bestFor: 'Enterprise frontends, large teams, complex forms, long-lived applications',
    files: 'src/app/ + components/ + services/ + models/ + pipes/',
  },
  astro: {
    title: 'Astro',
    description: 'Content-focused web framework shipping zero JavaScript by default. Islands architecture for interactive components. Use React, Vue, Svelte, or Solid components inside Astro pages. Perfect for content sites.',
    bestFor: 'Blogs, documentation, marketing sites, content-heavy websites',
    files: 'src/content/ + pages/ + components/ + layouts/ + islands/',
  },
};
