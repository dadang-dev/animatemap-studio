# Phase 7E — Authenticated shared projects

Status: pre-implementation contract. Release v15 local regression (75 default scenarios plus one real Codex opt-in) and actual 300-frame benchmark passed before this module. Public cloud deployment remains a distinct unverified gate.

Scope: build real account/session/role-protected shared project persistence through the API, with explicit snapshot revisions and conflicts. Users create a local account through the UI; no external identity provider or API key is required for development verification. Validate collaboration using independent browser contexts and real requests, not intercepted endpoints. Keep the existing offline editor, project JSON contract and render pipeline independent of authentication. Local-only API routes remain available for the existing local mode. Deployment must not be enabled automatically.

Files/interfaces:

- A separate server collaboration service owns persisted user records, salted password hashes, hashed expiring session tokens, owner/editor/viewer membership and versioned project documents under an ignored dedicated storage root. Public response contracts exclude password/session hashes. Password processing, request sizes, account/session/document/member counts, storage paths and resource usage are bounded. Session cookies are HttpOnly/SameSite, and auth/role checks apply to every shared-project route.
- A versioned shared-document contract wraps the existing validated v15 project with a revision and membership metadata; editor project JSON itself does not change. Create/read/list/update/share/revoke/delete operations are atomic within the single server. Updates require the current revision; stale writes return 409 with the current document, preserving both saved server state and the caller's local draft. No automatic merge or forced overwrite.
- A shared-project dialog provides registration/login/logout, list/create/open/save, member roles and explicit conflict recovery: load the server revision or save the local draft as a separate project. Loading replaces local editing state only on an explicit action and retains undo where appropriate; credentials are not written to project JSON, IndexedDB or logs. Shared saves persist original geography/media and do not invoke rendering or Codex.
- Unit/integration tests exercise hashes/session expiry/authentication, role enforcement, owner protection, revision concurrency, atomic failure/persistence/restart, source preservation, quotas and hostile inputs. Browser tests use two actual account sessions and verify shared editing/conflicts, local draft preservation, roles/revocation, logout and unchanged local export.

Acceptance:

- [ ] Account/session data survive service restart securely; unauthorized requests cannot enumerate or mutate shared documents.
- [ ] Two real sessions share/read/edit according to roles; concurrent saves yield one accepted revision and an actionable conflict, with no silent data loss.
- [ ] UI preserves local drafts on errors/conflicts and resolves conflicts through explicit server-load or independent-copy actions.
- [ ] Original validated project geometry/assets/timing persist through sharing; malformed updates and service failures retain the last saved document.
- [ ] Static/unit/integration/build/format/audit and affected real browser/export gates pass.
- [ ] Actual remotely hosted multi-user deployment is verified with configured TLS, secure-cookie/origin policy, storage/backups and operational limits before claiming a cloud release.

Risks: authentication introduces credential and quota handling; local loopback verification is not public-cloud security certification. A single process can serialize atomic revision updates, but multiple server processes need a transactional database/lock contract. Concurrent editing is snapshot collaboration with conflicts, not real-time CRDT co-editing. Optional deployment and billing remain visibly unconfigured until their actual environments exist; do not implement fake payment success or invented hosted URLs.
