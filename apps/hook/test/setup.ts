// Every spawned hook inherits this, so no test sends a request to Intuition's index by accident.
process.env['ARP_FAILURE_LINES'] = 'off';
// Nor puts the sharing question into a request, or starts a send: `share-ask.test.ts` turns it on (task 126).
process.env['ARP_SHARE_AUTO'] = 'off';
