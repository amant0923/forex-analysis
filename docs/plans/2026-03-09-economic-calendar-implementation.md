# Economic Calendar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an economic calendar feature to ForexPulse — scrape ForexFactory for USD/EUR/GBP events, store in Postgres, show upcoming events on dashboard and full calendar on a dedicated page.

**Architecture:** Python scraper parses ForexFactory HTML → stores in `economic_events` table → Next.js pages query and display. Daily pipeline fetches current + next week's events.

**Tech Stack:** Python 3.11+ (urllib, re), Next.js 16, Neon Postgres, Tailwind CSS

---

### Task 1: Database migration — economic_events table

### Task 2: ForexFactory scraper — Python module

### Task 3: TypeScript types + queries for economic events

### Task 4: Upcoming events dashboard strip component

### Task 5: Full calendar page (/calendar)

### Task 6: Add calendar link to TopNav

### Task 7: Pipeline integration + initial data load

### Task 8: Build verification
