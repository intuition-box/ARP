import {renderToString} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {ActivityLog} from "../../services/activity-log";
import {AgentFeed} from "../../services/agent-feed";
import {useActivityLog} from "../use-activity-log";
import {useAgentActivity} from "../use-agent-activity";

/**
 * Rendered on a server, where there is no live log and no feed to connect to, both hooks render the
 * empty state rather than whatever a module-level log happens to hold.
 */
function LogCount({log}: {log: ActivityLog}) {
    return <span>{useActivityLog(log).length}</span>;
}

function FeedState({feed}: {feed: AgentFeed}) {
    const {events, status} = useAgentActivity(feed);
    return (
        <span>
            {events.length} {status}
        </span>
    );
}

describe("server rendering", () => {
    it("shows an empty log even when the log holds entries", () => {
        const log = new ActivityLog();
        log.append({stream: "mine", step: "sent", label: "support"});
        expect(renderToString(<LogCount log={log} />)).toBe("<span>0</span>");
    });

    it("shows the feed as off, with no events", () => {
        const feed = new AgentFeed(new ActivityLog(), {
            url: undefined,
            open: () => {
                throw new Error("a server never opens the feed");
            },
            readReceipt: async () => null,
        });
        expect(renderToString(<FeedState feed={feed} />)).toBe("<span>0<!-- --> <!-- -->off</span>");
    });
});
