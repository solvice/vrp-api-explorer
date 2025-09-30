# Claude for VRP Explainability: Messages API vs Agent SDK

The **Messages API is the clear winner** for integrating AI explainability into Solvice.io's VRP dashboard, delivering real-time route explanations at **one-tenth the cost** of the Agent SDK while maintaining simpler architecture and faster implementation. This recommendation is based on comprehensive analysis of technical capabilities, cost patterns, and VRP-specific explainability requirements.

The Messages API provides everything needed for a developer-facing dashboard: sub-second streaming responses, precise control over explanations, and straightforward integration with existing web infrastructure. Implementation takes days rather than weeks, with typical explanation costs of **$0.003-$0.004 per query** after optimization. The Agent SDK, while powerful for autonomous multi-step analysis, introduces unnecessary complexity and **10-15x higher token consumption** for standard explanation tasks. Reserve it exclusively for advanced "deep analysis" features where developers need comprehensive route optimization investigations.

## The fundamental architectural difference shapes everything

The Messages API operates as a traditional REST endpoint where your application controls every interaction. You send a request with route data and constraints, Claude streams back natural language explanations token-by-token, and your dashboard renders the response in real-time. This stateless request-response pattern gives you complete control over context management, error handling, and user experience. Your backend acts as an intelligent proxy, structuring VRP data into prompts and managing conversation history when developers ask follow-up questions.

The Agent SDK represents a fundamentally different paradigm—an **autonomous agent framework** built on the same infrastructure that powers Claude Code. Rather than direct API calls, you deploy an agent harness that manages multi-step reasoning loops: gather context, take actions, verify work, repeat. The SDK includes a full tool ecosystem (file operations, bash execution, code generation, web search), automatic context compaction, and subagent coordination for parallel processing. This architecture excels when tasks require autonomous investigation across multiple steps, but introduces significant overhead: Node.js runtime requirements, file system dependencies, complex session management, and unpredictable execution paths.

For explaining why route A goes to customer B before customer C, the Messages API provides a clean solution: structure the route data and constraints into a prompt, stream the explanation to your UI, done. The Agent SDK would initialize an agent harness, potentially spawn file operations, run multi-step reasoning chains, and consume thousands of additional tokens—capabilities that provide zero value for straightforward explanation tasks.

## Implementation complexity favors Messages API dramatically

Getting started with the Messages API takes **under an hour**. Install the Anthropic Python SDK, set up your API key, create a FastAPI endpoint that accepts route data, structure a prompt explaining the VRP context, and stream responses back to your frontend. The entire backend integration fits in 50-100 lines of code. Frontend integration uses standard fetch API or WebSocket for streaming text, with progressive rendering as tokens arrive.

The Agent SDK requires **4-8 hours of initial setup** even for experienced developers. Install Node.js, install the Claude Code CLI globally, configure authentication, set up file system directories for agent access, write agent configuration files, implement hooks for permission management, and build orchestration logic for agent sessions. Production deployment demands additional infrastructure: managing agent lifecycle, monitoring file system side effects, handling concurrent agent sessions, and implementing safety controls to prevent unauthorized tool use. The learning curve is steep, with multiple abstraction layers between your code and Claude.

Maintenance overhead compounds over time. The Messages API requires only standard API version management and conversation history storage—patterns familiar to any web developer. The Agent SDK demands ongoing CLI updates, file system monitoring, session cleanup, MCP server maintenance, and debugging of autonomous agent behaviors that can be unpredictable.

## Real-time explanation capabilities are excellent with Messages API

Streaming performance is the critical metric for interactive dashboards, and the Messages API delivers **sub-second Time to First Token** with proper optimization. Server-Sent Events provide token-by-token delivery, enabling progressive rendering where explanations appear instantly and build in real-time. Users see the first words within 300-500ms, creating the perception of immediate responsiveness even as Claude generates detailed multi-paragraph explanations.

The key optimization is **prompt caching**, which reduces latency by **over 70%** while simultaneously cutting costs. Cache your system prompt containing VRP domain knowledge, common constraint definitions, and explanation guidelines. Cache frequently-accessed route templates and customer data. The first request pays a small cache-write premium, but subsequent requests benefit from near-instant cache reads. For a dashboard serving multiple developers, this means most explanations start streaming within 200-300ms.

Implementation pattern for optimal streaming:

Your frontend sends a request when developers click "Explain this route." Your backend structures the VRP data into a concise JSON format, constructs a prompt referencing cached context, and opens a streaming connection to Claude. As each token arrives, your backend forwards it through WebSocket or Server-Sent Events to the dashboard. The UI renders text progressively with a typewriter effect, shows relevant route segments highlighted on the map, and enables follow-up questions once streaming completes. Total latency for a typical explanation: under 3 seconds for 300-500 tokens of detailed analysis.

The Agent SDK introduces higher latency due to its autonomous nature. Multi-step reasoning loops, file system operations, and tool use coordination add overhead. While the SDK includes optimizations like context compaction, you sacrifice the precise latency control that real-time dashboards demand. Execution time becomes unpredictable—simple explanations might take 5-10 seconds, complex analyses could run minutes.

## Cost analysis reveals Messages API efficiency

Both approaches use identical base pricing since the Agent SDK ultimately calls the same Claude API. **Claude Sonnet 4** costs $3 per million input tokens and $15 per million output tokens—the sweet spot for VRP explanations balancing capability and cost. But token consumption patterns differ radically.

A typical Messages API explanation consumes **500-1,000 input tokens** (system prompt + route data + question) and generates **300-800 output tokens** (detailed explanation). Cost per explanation: approximately **$0.0045** before optimization. With aggressive prompt caching on system instructions and common route patterns, costs drop to **$0.0015-$0.002 per explanation**—a 60-70% reduction. The cache write premium (1.25x) is paid once every 5 minutes, while cache reads (0.1x) benefit all subsequent requests.

The Agent SDK consumes **10,000-50,000 tokens per task** due to architectural overhead. Tool definitions add 2,000-7,000 tokens. Multi-step reasoning requires 3-5 API calls per workflow, each accumulating context. Subagents spawn their own contexts. A task that Messages API handles in 1,500 tokens easily balloons to 20,000+ tokens with the Agent SDK. Cost per task: **$0.05-$0.15**, making it 10-30x more expensive than Messages API for equivalent explanations.

For a dashboard serving **1,000 developers making 10 explanation requests daily** (10,000 queries/day, 300,000/month):

**Unoptimized Messages API**: $8,100/month

**Optimized Messages API** (with caching, smart routing): **$975-$1,950/month**

**Agent SDK approach**: $15,000-$45,000/month

The cost difference is stark because VRP explanations don't benefit from Agent SDK capabilities. You're paying for autonomous multi-step reasoning, file system access, and tool orchestration that provide zero value when explaining "why did this route prioritize time windows over distance?"

## Scalability and rate limits require attention

Both approaches share the same rate limits since they use Claude API infrastructure. Standard Tier 1 provides **50 requests per minute** and critically, **30,000 input tokens per minute** and **8,000 output tokens per minute**. For Messages API queries averaging 750 input tokens, you can sustain approximately **40 requests per minute** before hitting token limits. The Agent SDK, consuming 15,000+ tokens per workflow, hits token limits at **2-5 workflows per minute**.

Request rate limits (50 RPM) rarely constrain Messages API usage since most dashboards won't exceed this for individual explanations. But token-per-minute limits become the real bottleneck. The solution: implement request queuing with exponential backoff, monitor rate limit headers, and design your UI to batch or throttle explanation requests during peak usage.

Tier progression helps but requires planning. You automatically advance tiers after 14 days of qualifying usage, but rapid scaling requires proactive contact with Anthropic sales for custom limits. For production dashboards, plan capacity needs ahead of growth milestones rather than reactively responding to rate limit errors.

## VRP explainability demands domain-specific prompting

Vehicle Routing Problems present unique explainability challenges that generic AI explanations can't address. Developers integrating Solvice.io's API need to understand **why** the algorithm made specific routing decisions: why customer A was visited before customer B, why this particular vehicle was assigned, why the route doesn't match their intuition about optimal paths. These questions require deep understanding of constraint interactions, optimization objectives, and trade-off spaces.

The **RouteExplainer framework** from academic research provides the state-of-the-art pattern: treat explanations as **counterfactual reasoning**. Instead of simply describing what the algorithm did, explain what would happen with alternative choices. "This route visits location B before location C because visiting C first would violate the time window constraint at location D, adding 15 minutes of wait time and potentially causing late delivery." This concrete comparison helps developers understand not just the decision, but the constraint landscape that shaped it.

Implement this pattern through structured prompting. Your system prompt establishes Claude as a VRP optimization expert explaining to software developers. Include precise definitions of constraint types (hard constraints that must be satisfied vs. soft constraints that incur penalties), optimization objectives (minimize distance, minimize time, minimize fleet size), and common trade-offs (capacity utilization vs. route efficiency). For each explanation request, structure the input to include:

**Current routing decision** with full context (route sequence, vehicle assignments, constraint status)

**Relevant constraints** at the decision point (capacity remaining, active time windows, distance matrix)

**Alternative choices** that weren't selected (what other customers could have been visited next)

**Optimization metrics** for comparison (total distance, time window slack, capacity utilization)

Then prompt Claude to analyze why the algorithm chose option A over option B, quantifying the impact on key metrics and explaining which constraints were prioritized. This structured approach prevents vague explanations like "the route was optimized for efficiency" and generates specific, actionable insights like "visiting customer B first adds 2.3km but ensures compliance with all time windows, whereas visiting customer C would save distance but cause a 12-minute late arrival at customer D, violating the hard time window constraint."

## Effective prompts balance structure and flexibility

Chain-of-thought prompting delivers the best results for complex routing explanations. Structure your prompt to guide Claude through explicit reasoning steps: first identify relevant constraints, then calculate what would happen with alternatives, then compare outcomes quantitatively, finally synthesize the explanation in developer-friendly language. This mirrors how human experts explain optimization decisions and produces more accurate, complete explanations than asking Claude to generate explanations directly.

Example prompt structure for "Why this route order?":

```
You are explaining a VRP routing decision to a software developer using Solvice.io's API.

Context:
- Current route: Depot → C1(09:15) → C3(10:30) → C2(11:45) → Depot
- Alternative route: Depot → C1(09:15) → C2(09:45) → C3(12:00) → Depot
- Time windows: C1[09:00-09:30], C2[09:30-12:00], C3[10:00-11:00]
- Vehicle capacity: 100 units, demands: C1=30, C2=40, C3=25

Task:
1. Identify which constraints are active at this decision point
2. Calculate outcomes for both route orderings on time windows and distance
3. Explain which ordering satisfies more constraints and why
4. Quantify the trade-off (what do we gain/lose with each choice?)
5. State the primary reason this ordering was selected

Provide specific numbers and reference constraint violations explicitly.
```

This prompt guides Claude to perform structured analysis rather than guessing at explanations. The result: accurate, grounded explanations that correctly represent solver behavior.

For your Solvice.io integration, maintain a library of prompt templates for common explanation patterns: route ordering explanations, vehicle assignment explanations, fleet size justifications, constraint violation analysis, and optimization trade-off comparisons. Version control these templates and iterate based on developer feedback. This systematic approach ensures explanation quality and consistency across your dashboard.

## Prompt caching is mandatory for cost efficiency

Implementing prompt caching from day one is non-negotiable. The 90% cost reduction and 70%+ latency improvement transform economics and user experience. Cache all static or semi-static content: system instructions defining Claude's role and expertise, VRP domain knowledge and constraint definitions, common routing patterns and heuristics, and Solvice.io API documentation references.

Technical implementation: Structure your prompts with cacheable content first, marked with `cache_control: {"type": "ephemeral"}` parameters. Place variable content (specific route data, user questions) after cached sections. The cache lasts 5 minutes and refreshes on each use, making it perfect for interactive dashboards where developers ask multiple questions about the same routing scenario within a session.

Cost impact example: A system prompt with 2,000 tokens of VRP expertise cached and accessed 1,000 times daily. Without caching: 2 million tokens × $3/million = $6/day ($180/month). With caching: One cache write (2,000 × $3.75/million) + 999 cache reads (2,000 × $0.30/million) = $0.60/day ($18/month). The 90% reduction compounds across all cached content.

Design your caching strategy hierarchically. Level 1: System instructions and VRP fundamentals (cache for entire application). Level 2: Customer-specific routing patterns (cache per customer session). Level 3: Individual route contexts (cache for immediate follow-up questions). This multi-tier approach maximizes cache hit rates while keeping cache write overhead minimal.

## Integration architecture for production dashboards

The recommended architecture for Solvice.io's VRP dashboard uses Messages API as the primary explanation engine with optional Agent SDK integration for advanced analysis features. This hybrid approach delivers optimal cost-performance while enabling power-user capabilities.

**Frontend (React/Vue/Angular)**: Interactive route visualization with selectable elements. When developers click a route segment, vehicle, or customer, trigger an explanation request. Use WebSocket or Server-Sent Events for streaming responses, rendering explanation text progressively as it arrives. Implement caching at the client level for recently explained elements (5-minute TTL matching API cache expiry). Provide follow-up question input for conversational exploration of routing decisions.

**Backend (FastAPI/Express/Go)**: Explanation orchestrator that structures VRP data for Claude. When receiving explanation requests, extract relevant subset of route data (avoid sending entire dataset), construct prompts using cached templates, call Messages API with streaming enabled, forward tokens to frontend as they arrive. Maintain conversation history for follow-up questions within sessions. Implement rate limiting and request queuing to stay within API limits. Log token usage for cost monitoring and optimization.

**Prompt Management**: Version-controlled prompt templates for common explanation types stored as configuration. System prompts with VRP domain knowledge loaded at startup. Customer-specific contexts (optimization priorities, business rules) loaded per session. This separation of concerns makes prompt iteration fast without code changes.

**Optional Agent SDK Integration**: For developers who need deep analysis—"Why is my fleet efficiency down 15% this week?" or "Generate comprehensive optimization report for this route plan"—offer a separate "Deep Analysis" feature. This triggers an Agent SDK workflow that runs asynchronously, performs multi-step investigation including file-based data analysis and code generation for visualizations, and delivers results via email or background download. This keeps the Agent SDK's higher costs and complexity isolated to features where its capabilities genuinely add value.

## Specific recommendations for Solvice.io implementation

Start with a **minimum viable explanation system** using Messages API exclusively. Implement three core explanation types that cover 80% of developer needs:

**Route ordering explanations**: "Why does vehicle 2 visit customer A before customer B?" Structured prompt analyzing time windows, capacity constraints, and distance trade-offs with specific quantitative outcomes.

**Vehicle assignment explanations**: "Why is customer X assigned to vehicle 2 instead of vehicle 1?" Comparison of capacity utilization, route efficiency, and constraint satisfaction across vehicles.

**Constraint violation analysis**: "Why does this solution violate the time window at customer Y?" Explanation of competing constraints that forced this trade-off and suggestions for resolving the violation.

These three patterns handle the vast majority of "why did the API return this?" questions that developers face when integrating routing APIs. Implement each as a prompt template with placeholders for route data, cache system instructions aggressively, and stream results in under 3 seconds.

Build the UI with progressive disclosure. Start with a concise one-sentence summary answering the core question. Provide expandable sections for detailed constraint analysis, alternative route comparisons, and optimization trade-off explanations. This prevents overwhelming developers while enabling those who need depth to drill down. Include inline tooltips defining technical terms (time window slack, capacity utilization, route compactness) so explanations remain accessible to developers without operations research backgrounds.

Instrument everything for iteration. Log which explanation types developers request most frequently. Track follow-up question patterns to identify gaps in initial explanations. Monitor token usage per explanation type to optimize prompts. Collect developer feedback through quick thumbs-up/down ratings. Use this data to refine prompt templates, adjust caching strategies, and identify opportunities for pre-generated explanations.

For cost optimization, implement **intelligent routing across Claude models**. Use Haiku 3.5 ($0.80/$4 per million tokens) for simple, factual explanations like "What is this customer's time window?" Use Sonnet 4 ($3/$15 per million tokens) for standard routing explanations requiring moderate reasoning. Reserve Opus 4 ($15/$75 per million tokens) for complex multi-constraint trade-off analysis. Classification logic can be simple: question length, number of constraints involved, and whether it requires counterfactual reasoning. This routing reduces costs by 40-60% compared to using Sonnet 4 exclusively.

Consider pre-generating explanations for common scenarios through batch processing. Each night, analyze the day's routing solutions and generate explanations for typical patterns: most common route orderings, standard vehicle assignments, frequently occurring constraint trade-offs. Store these explanations in a database with vector embeddings for semantic search. When developers request explanations, check if a similar scenario exists in the database first (sub-100ms lookup). If found, return cached explanation immediately; if novel, call Messages API for real-time generation. This hybrid approach provides instant responses for common cases while maintaining flexibility for edge cases.

## Advanced features using Agent SDK selectively

Reserve Agent SDK for specialized features where autonomous multi-step reasoning genuinely adds value. Implement a "Comprehensive Route Analysis" feature that developers trigger when they need deep investigation of routing quality. This workflow runs asynchronously (background job, email results) and performs analysis that Messages API cannot efficiently handle: comparative analysis across multiple solution runs, historical trend analysis requiring file-based data access, optimization parameter tuning with code generation and execution, and detailed simulation of alternative constraint configurations.

The Agent SDK excels at these workflows because they require true autonomous investigation: reading multiple data files, running calculations or simulations, generating visualization code, executing that code to produce charts, and synthesizing findings across multiple analysis steps. A single Messages API call can't coordinate these activities effectively, but an Agent SDK workflow handles it naturally through its agent loop and tool ecosystem.

Example workflow for fleet efficiency analysis: Agent reads historical route data files from the past month, runs statistical analysis to identify trends, generates Python code to visualize efficiency metrics over time, executes the code to produce charts, compares current performance against historical baselines, identifies specific routes or vehicles with degraded performance, generates counterfactual scenarios showing impact of different configurations, and synthesizes all findings into a comprehensive report with embedded visualizations. This autonomous investigation justifies the Agent SDK's higher token consumption and complexity.

Implement these advanced features with clear UI separation—a "Power Tools" section or "Advanced Analysis" tab that sets appropriate expectations for processing time and depth. Show progress indicators during agent execution. Store results persistently so developers can review detailed analyses without re-running expensive workflows.

## Limitations and mitigations for production systems

Large language models cannot solve optimization problems—they can only explain solutions. Never use Claude to generate routing decisions directly; always use specialized solvers like Solvice.io's OnRoute API for actual optimization. Claude's role is strictly explanation and natural language synthesis of algorithmic decisions.

Hallucination risk remains the primary concern. Claude may generate plausible but incorrect explanations if prompts lack sufficient grounding in actual solution data. Mitigation requires structured prompts that force Claude to reference specific data points: constraint values, metric calculations, and solution comparisons. Include explicit instructions: "Base your explanation only on the provided route data. Do not make assumptions about constraints not listed." Validate high-stakes explanations through automated checks that verify key claims against actual route data.

Maintain human expertise in the loop for critical scenarios. When explanations involve safety-critical decisions, large financial impacts, or legal/compliance requirements, escalate to human operations research experts for validation. Claude accelerates explanation generation but doesn't replace domain expertise for critical decisions.

Implement robust monitoring to catch explanation quality issues early. Log all explanations, track developer feedback ratings, and periodically sample explanations for expert review. When developers report incorrect explanations, investigate prompt deficiencies and update templates. Version control prompts like code, with changelog documentation and rollback capabilities.

## Performance targets and monitoring

Set clear latency goals and monitor continuously. Target **sub-500ms Time to First Token** at P95 (95th percentile), meaning 95% of explanation requests start streaming within half a second. Full explanation delivery (300-500 tokens) should complete within **3 seconds at P95**. These targets create perceived instant responsiveness crucial for interactive dashboards.

Implement comprehensive telemetry: latency metrics (TTFT, full response time) by explanation type, token usage (input/output) by query, cache hit rates and cost savings, rate limit errors and recovery, and developer engagement metrics (follow-up question rate, explanation ratings). Dashboard these metrics for real-time visibility into system health and cost patterns.

Set up alerts for anomalies: TTFT exceeding 1 second sustained over 5 minutes, cache hit rate dropping below 70%, token usage spiking above daily budget, rate limit errors occurring, and explanation quality ratings dropping below threshold. These signals indicate issues requiring immediate investigation.

## Migration path and rollout strategy

Phase 1 (Weeks 1-2): **MVP Implementation**. Build core Messages API integration with three explanation types. Basic streaming to UI. No caching, simple error handling. Deploy to internal testing with Solvice.io developers. Goal: Validate core functionality and gather initial feedback.

Phase 2 (Weeks 3-4): **Production Hardening**. Implement prompt caching for 90% cost reduction. Add comprehensive error handling and retry logic with exponential backoff. Implement conversation history for follow-up questions. Deploy to beta customers (10-20 developers). Instrument with full telemetry. Goal: Achieve production stability and gather usage patterns.

Phase 3 (Weeks 5-8): **Optimization and Scale**. Implement intelligent model routing (Haiku/Sonnet/Opus). Add pre-generated explanation database for common scenarios. Build monitoring dashboards and alerting. Optimize prompts based on beta feedback. Full customer rollout. Goal: Achieve cost targets and scale to all users.

Phase 4 (Weeks 9-12+): **Advanced Features**. Integrate Agent SDK for "Deep Analysis" features. Add multi-modal explanations with route visualization analysis. Implement A/B testing for prompt variations. Build explanation quality feedback loop. Goal: Differentiated capabilities and continuous improvement.

This phased approach de-risks implementation, enables learning from real usage, and delivers value incrementally rather than requiring months of development before any customer sees benefit.

## Conclusion and decision framework

For Solvice.io's VRP dashboard, the **Messages API is unequivocally the right choice** for core explanation functionality. It delivers everything developers need—real-time streaming explanations, precise control over interactions, simple integration, predictable costs at $0.002-$0.004 per explanation—with none of the complexity the Agent SDK introduces. Implementation takes days instead of weeks, maintenance remains straightforward, and the architecture scales naturally with user growth.

Use the Agent SDK exclusively for specialized "Deep Analysis" features where autonomous multi-step investigation genuinely adds value and users accept longer processing times. This represents perhaps 10-20% of use cases at most. For the remaining 80-90% of explanation requests, Messages API provides superior cost-performance.

Success factors: Implement prompt caching immediately for 90% cost reduction and 70% latency improvement. Structure prompts to enforce grounded explanations based on actual route data. Build a library of prompt templates for common explanation patterns. Monitor token usage and explanation quality continuously. Iterate based on developer feedback to refine prompts.

Expected outcomes with optimized implementation: Explanation latency under 500ms to first token, under 3 seconds for complete explanations. Cost of $1,000-$2,000 monthly for 10,000 daily explanations (300,000/month). Developer satisfaction improvements from transparent, understandable routing decisions. Reduced support burden as developers self-serve explanations through the dashboard.

The combination of Messages API for real-time explanations, aggressive prompt caching, structured VRP-specific prompting, and selective Agent SDK integration for power features provides the optimal architecture for making Solvice.io's routing algorithms transparent, understandable, and trustworthy to developers integrating the API.