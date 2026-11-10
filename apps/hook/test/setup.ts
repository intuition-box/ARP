// Every spawned hook inherits this, so no test sends a request to Intuition's index by accident.
process.env['ARP_FAILURE_LINES'] = 'off';
