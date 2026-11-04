import { handleInviteRequest } from '../lib/invite-auth.mjs';

export default {
  fetch(request) { return handleInviteRequest(request, process.env, true); },
};
