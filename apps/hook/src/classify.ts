import type { ToolCall } from './payload.ts';

/**
 * Succeeded or failed, and how: the only thing the hook keeps from a call's outcome.
 *
 * | outcome | rule |
 * | --- | --- |
 * | `ok` | the call succeeded and nothing in the response flags an error |
 * | `tool_error` | the tool failed: `PostToolUseFailure`, MCP `isError`, HTTP 5xx, or a failure nothing below explains |
 * | `auth` | 401 or 403, or an authentication message — usually the operator's configuration |
 * | `timeout` | no answer in time |
 * | `unreachable` | DNS, TLS, connection refused or reset |
 * | `payment_required` | x402's challenge: a 402 or a `PaymentRequired` object, with no sign of refusal. **Not a failure**: it is the ordinary first answer of every x402 call |
 * | `payment_refused` | x402: the payment was refused or failed before it settled — insufficient funds, a rejected or invalid payment, `Settlement failed`, a settlement response with `success: false` or an `errorReason` |
 * | `paid_no_delivery` | a settlement is in the call's own payload (`success: true` and a transaction) and the call failed or came back with no content |
 *
 * Kept to what one payload shows. Whether a `payment_required` was then paid is the **next** line of
 * that tool in that session (`ok` or `paid_no_delivery`): the log is appended, never rewritten, so no
 * line is changed after the fact. A settlement counts only when the payload carries one: the MCP
 * transport puts it in `_meta["x402/payment-response"]`, and Claude Code hands the hook an MCP
 * result's content blocks and not its `_meta` (`test/fixtures/claude/mcp-post-tool-use.json`), so
 * there it is seen only when the tool writes it in its result. Without one, a paid call that failed
 * stays `tool_error` and an empty answer stays `ok` — never guessed. The transaction is read to
 * decide and never returned. Until 2026-11-11 one outcome, `payment`, held all three and also
 * caught any failure whose text said `x402` (task 125).
 *
 * A call the user cancelled or interrupted returns `null` and is not recorded: nothing was used.
 *
 * The failure's text is read to pick a category and **never returned**. The result carries an
 * outcome and at most a status code. Taken from the `arp-cli-v0` patch
 * (`docs/design/cli-v0/files-packages-cli/src/classify.ts`, removed in task 139; in git at `72a62f1c`),
 * adapted to {@link ToolCall}.
 */
export type Outcome =
  | 'ok'
  | 'tool_error'
  | 'auth'
  | 'timeout'
  | 'unreachable'
  | 'payment_required'
  | 'payment_refused'
  | 'paid_no_delivery';

/** Every outcome but `ok` and the x402 challenge, which is a step and not a failure. */
export function isFailure(outcome: Outcome): boolean {
  return outcome !== 'ok' && outcome !== 'payment_required';
}

export type Classified = { outcome: Outcome; code: string | null };

const CANCELLED =
  /\b(interrupted|cancel(l)?ed|aborted) by (the )?user\b|\buser (rejected|denied|declined)\b|\bpermission denied by user\b|\buser doesn't want to (proceed|take this action)\b/i;

/** The person stopped it, so it says nothing about what it ran. */
export function isCancelled(text: string): boolean {
  return CANCELLED.test(text);
}
const AUTH =
  /\b(unauthori[sz]ed|forbidden|invalid (api )?(key|token)|authentication|not authenticated|expired token)\b/i;
const TIMEOUT = /\b(timed? ?out|timeout|deadline exceeded|ETIMEDOUT)\b/i;
const UNREACHABLE =
  /\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|getaddrinfo|certificate|TLS|SSL|socket hang up|connection refused|fetch failed)\b/i;
/** x402's challenge, by its status words or by the `PaymentRequired` object's two telling keys. */
const CHALLENGE = /\bpayment required\b|"x402Version"[\s\S]{0,2000}"accepts"|"accepts"[\s\S]{0,2000}"x402Version"/i;
const REFUSED = /\binsufficient[ _](funds|balance)\b|\bpayment (failed|refused|rejected|declined|invalid)\b|\bsettlement failed\b/i;
/** Refusal marks that many APIs share, so they count only in a text that is about x402 or a payment. */
const REFUSED_IN_X402 = /"success"\s*:\s*false|"errorReason"\s*:\s*"[^"]+"|\binvalid_[a-z_]*(signature|payload|payment)[a-z_]*\b/i;
const ABOUT_PAYMENT = /\bx402|\bpayment\b/i;
/** An EVM transaction hash, or a Solana signature in base58. */
const TRANSACTION = /^(0x[0-9a-fA-F]{64}|[1-9A-HJ-NP-Za-km-z]{64,90})$/;
const FLAT_OBJECT = /\{[^{}]{0,2000}\}/g;
const RESPONSE_HEADER = /\b(?:x-)?payment-response\s*[:=]\s*"?([A-Za-z0-9+/=_-]{16,4000})/gi;
const STATUS = /\b(40[123]|429|5\d\d)\b/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Every string a failure might carry, from the places a payload has been seen to put one. */
export function failureText(call: ToolCall): string {
  const parts: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === 'string') parts.push(value);
    else if (isRecord(value)) {
      for (const key of ['error', 'message', 'reason']) {
        const text = value[key];
        if (typeof text === 'string') parts.push(text);
      }
      if (Array.isArray(value.content)) {
        for (const item of value.content) {
          if (isRecord(item) && typeof item.text === 'string') parts.push(item.text);
        }
      }
    }
  };
  push(call.error);
  push(call.response);
  return parts.join('\n').slice(0, 4000);
}

function statusOf(call: ToolCall): number | null {
  if (!isRecord(call.response)) return null;
  for (const key of ['status', 'statusCode', 'status_code']) {
    const value = call.response[key];
    if (typeof value === 'number' && Number.isInteger(value)) return value;
  }
  return null;
}

function flaggedError(response: unknown): boolean {
  return isRecord(response) && (response.isError === true || response.is_error === true);
}

/** A settlement response that says it settled: `success: true`, a network and a transaction (x402's `SettleResponse`). */
function isSettled(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.network === 'string' &&
    typeof value.transaction === 'string' &&
    TRANSACTION.test(value.transaction)
  );
}

/** Every string the response holds, at most four levels down. Read to decide, never kept. */
function stringsOf(value: unknown, depth = 0, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (depth < 4 && Array.isArray(value)) for (const item of value) stringsOf(item, depth + 1, out);
  else if (depth < 4 && isRecord(value)) for (const item of Object.values(value)) stringsOf(item, depth + 1, out);
  return out;
}

/** A settlement response that says it did not settle. */
function isUnsettled(value: unknown): boolean {
  return isRecord(value) && value.success === false && typeof value.network === 'string';
}

/** Whether `test` holds of the value or of anything in it, at most four levels down. */
function anyIn(value: unknown, test: (value: unknown) => boolean, depth = 0): boolean {
  if (test(value)) return true;
  if (depth >= 4) return false;
  if (Array.isArray(value)) return value.some((item) => anyIn(item, test, depth + 1));
  if (isRecord(value)) return Object.values(value).some((item) => anyIn(item, test, depth + 1));
  return false;
}

function parsed(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON: an ordinary sentence that happens to hold braces.
    return null;
  }
}

function decoded(base64: string): string {
  try {
    return Buffer.from(base64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch {
    // Not base64 after all, so it settles nothing.
    return '';
  }
}

/** A settlement in a text: a `SettleResponse` written as JSON, or a `PAYMENT-RESPONSE` header's base64 one. */
function settledInText(text: string): boolean {
  for (const [object] of text.matchAll(FLAT_OBJECT)) if (isSettled(parsed(object))) return true;
  for (const match of text.matchAll(RESPONSE_HEADER)) if (isSettled(parsed(decoded(match[1] ?? '')))) return true;
  return false;
}

/** Whether the call's own payload shows a payment that settled. Its transaction is never returned. */
export function settlementIn(call: ToolCall): boolean {
  if (anyIn(call.response, isSettled)) return true;
  const texts = [...(call.error === null ? [] : [call.error]), ...stringsOf(call.response)];
  return texts.some(settledInText);
}

/**
 * Whether the response holds content and all of it is blank: a string, MCP content blocks, or a
 * `content` array. `false` for any other shape, whose content the hook cannot point at.
 */
function emptyContent(response: unknown): boolean {
  const blocks = Array.isArray(response) ? response : isRecord(response) && Array.isArray(response.content) ? response.content : null;
  if (typeof response === 'string') return response.trim().length === 0;
  if (blocks === null) return false;
  return blocks.every((block) => !isRecord(block) || typeof block.text !== 'string' || block.text.trim().length === 0 || isSettled(parsed(block.text)));
}

export function classifyCall(call: ToolCall): Classified | null {
  if (call.interrupted) return null;

  const failed =
    call.event === 'PostToolUseFailure' || call.error !== null || flaggedError(call.response);
  const status = statusOf(call);
  if (!failed && (status === null || status < 400)) {
    return settlementIn(call) && emptyContent(call.response) ? { outcome: 'paid_no_delivery', code: null } : { outcome: 'ok', code: null };
  }

  const text = failureText(call);
  if (CANCELLED.test(text)) return null;
  const found = [...text.matchAll(STATUS)].map((one) => Number(one[0]));
  // x402's 402 is a step of the call. Another status in the same failure is what ended it.
  const after = status !== null && status !== 402 ? status : (found.find((one) => one !== 402) ?? null);
  const challenge = status === 402 || (status === null && (found.includes(402) || CHALLENGE.test(text)));
  const match = after ?? (challenge ? 402 : null);
  const code = match === null ? null : String(match);
  if (settlementIn(call)) return { outcome: 'paid_no_delivery', code: after === null ? null : String(after) };
  const refused =
    anyIn(call.response, isUnsettled) || REFUSED.test(text) || ((challenge || ABOUT_PAYMENT.test(text)) && REFUSED_IN_X402.test(text));
  if (refused) {
    return { outcome: 'payment_refused', code };
  }
  if (challenge && after === null && !TIMEOUT.test(text) && !UNREACHABLE.test(text)) {
    return { outcome: 'payment_required', code };
  }
  if (match === 401 || match === 403 || AUTH.test(text)) return { outcome: 'auth', code };
  if (TIMEOUT.test(text)) return { outcome: 'timeout', code };
  if (UNREACHABLE.test(text)) return { outcome: 'unreachable', code };
  return { outcome: 'tool_error', code };
}
