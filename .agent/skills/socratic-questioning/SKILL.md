---
name: socratic-questioning
description: Apply Socratic questioning methodology to probe assumptions, uncover hidden requirements, and deepen understanding. Use when users need to clarify requirements, validate design decisions, architect systems, debug complex problems, or make decisions with unclear trade-offs. Effective for exposing blind spots, challenging assumptions, and reaching deeper insights through guided inquiry.
---

# Socratic Questioning Skill

Apply the Socratic method to probe deeper into problems, expose assumptions, and guide users toward clearer thinking through strategic questioning.

## When to Apply

- **Requirements gathering**: Uncover hidden or assumed requirements
- **Design decisions**: Challenge architectural choices and trade-offs
- **Debugging**: Trace root causes through systematic inquiry
- **Decision making**: Expose unstated criteria and biases
- **Documentation**: Ensure completeness before writing
- **Code review**: Question design choices, not just implementation

## The Six Question Types

Use these question categories strategically:

### 1. Clarification Questions

Probe the basics to ensure shared understanding.

- "What do you mean by X?"
- "Can you give me an example?"
- "How does this relate to Y?"
- "What's the core problem you're trying to solve?"

### 2. Probing Assumptions

Uncover unstated beliefs that may be wrong.

- "What are you assuming here?"
- "Why do you believe X is true?"
- "What would happen if that assumption was wrong?"
- "Is this always the case, or just sometimes?"

### 3. Probing Evidence/Reasoning

Examine the basis for conclusions.

- "How do you know this?"
- "What evidence supports this?"
- "Is there an alternative explanation?"
- "What led you to this conclusion?"

### 4. Questioning Viewpoints/Perspectives

Consider alternative angles.

- "How would [stakeholder X] see this?"
- "What would a skeptic say?"
- "Are there other ways to look at this?"
- "What's the strongest counter-argument?"

### 5. Probing Implications/Consequences

Trace the downstream effects.

- "If this is true, what follows?"
- "What would be the impact on X?"
- "How does this affect Y?"
- "What are the second-order effects?"

### 6. Questions About the Question

Meta-level inquiry to reframe the problem.

- "Why is this the question we're asking?"
- "Is there a more fundamental question?"
- "What would answering this actually tell us?"
- "Are we solving the right problem?"

## Application Patterns

### Pattern 1: Assumption Drill-Down

Use when: User states something as fact without evidence.

```
User: "We need to use microservices"
→ "What's driving the need for microservices specifically?"
→ "What problems would microservices solve that a monolith wouldn't?"
→ "What would happen if you started with a monolith?"
→ "What's the cost of being wrong about this decision?"
```

### Pattern 2: Requirements Excavation

Use when: Requirements seem incomplete or surface-level.

```
User: "Users need to log in"
→ "What happens after login?"
→ "What if login fails?"
→ "Do all users need the same access?"
→ "What does 'logged in' mean in terms of session duration?"
→ "What's the worst thing that could happen if auth is bypassed?"
```

### Pattern 3: Trade-off Illumination

Use when: User hasn't considered trade-offs.

```
User: "We'll cache everything"
→ "What happens when the cache is stale?"
→ "How will you know if cached data is wrong?"
→ "What's the cost of a cache miss?"
→ "What if the cache fails entirely?"
```

### Pattern 4: Edge Case Discovery

Use when: User describes happy path only.

```
User: "User clicks submit, data saves"
→ "What if they click submit twice?"
→ "What if the network fails mid-save?"
→ "What if another user edited the same record?"
→ "What if the data is invalid?"
```

## Execution Guidelines

### Pacing

- Start soft: Begin with clarification questions
- Build momentum: Move to assumption-probing as trust builds
- Go deep: Don't stop at the first answer—keep asking "why"
- Know when to stop: When user reaches genuine insight or answers become consistent

### Tone

- Collaborative, not interrogative
- Signal curiosity: "I'm wondering..." / "Help me understand..."
- Praise good thinking: "That's a good point. Now what about..."

### Integrate with Other Skills

- **With doc-coauthoring**: Use in Stage 1 (Context Gathering) and Stage 2 (Gap Check)
- **With code-reviewer**: Question design decisions, not just syntax
- **With frontend-design**: Challenge UX assumptions

### When to Stop

- User has articulated a clear, defensible position
- Same answers keep appearing (saturation)
- User explicitly wants to move forward
- Questions become circular

## Anti-patterns to Avoid

| Anti-pattern                 | Why it fails                   |
| ---------------------------- | ------------------------------ |
| Rapid-fire questions         | Feels like interrogation       |
| Leading questions            | Imposes your conclusion        |
| Asking what you already know | Wastes time, condescending     |
| Ignoring answers             | Makes user feel unheard        |
| Never stopping               | Frustrates and blocks progress |

## Quick Reference

**Start with**: "Help me understand..." / "What makes you say..."
**Probe assumptions**: "What are we taking for granted?"
**Find gaps**: "What happens if X fails?"
**Challenge**: "What would convince you this is wrong?"
**Stop when**: User reaches clarity or explicitly moves on
