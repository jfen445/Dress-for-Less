import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off (tests import from "vitest" explicitly), so Testing
// Library's automatic cleanup doesn't register itself. Do it by hand or a
// component left mounted by one test is found by the next one's queries.
afterEach(() => {
  cleanup();
});
