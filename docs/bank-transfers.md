# Bank transfers and receipt review

Apply `supabase/migrations/0010_bank_transfer_receipts.sql` after migrations
0001–0009, before deploying the application. It adds the payment method, private
receipt records and atomic submission/review functions. It does not change
historic payment outcomes or amounts.

Set these **server-only** environment variables locally and in the deployment:

```
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Use credentials from your Cloudinary product environment. No unsigned upload
preset is needed. Uploads are signed by the server and use `type=authenticated`.
Never put the API secret in a `NEXT_PUBLIC_` variable. Without credentials,
the transfer page warns the buyer to contact the organizer before transferring.

Buyers choose bank transfer in the existing ticket form, accepting the same
terms and receiving the same server-calculated reservation price. The transfer
page shows both supplied bank accounts and the reservation UUID as reference.
PEN and EUR — Santander are shown to every buyer. For soles-only reservations,
the transfer page converts the stored PEN amount using the configured effective
EUR/PEN rate and saves the EUR quote before displaying it. Existing EUR quotes
are preserved. If no valid rate is available, EUR remains visible but disabled.
The upload API and reviewer use the stored quote. Account
details live in `src/lib/transfer.ts`.

Buyers upload one JPG/PNG image (maximum 4 MB). The app checks ownership, file
signature, reservation status and currency before uploading. Cloudinary validates
the image. Metadata is recorded in Supabase; image bytes stay in Cloudinary.
Only the owner and administrators can access a receipt through an authenticated
route that creates a short-lived signed download URL. No public media URL is stored.

`/account` links pending reservations to the transfer page. A failed historic
checkout is not silently reactivated: the buyer creates a new reservation through
the event form, with current availability, prices and account checks.

Administrators open `/admin/transfers`, inspect the image and verify the actual
bank deposit and currency/amount before approving. Decisions record the reviewer
and timestamp. The database locks the reservation and receipt during review;
only one pending/approved receipt per reservation is allowed. Approval marks the
ticket paid; rejection preserves the pending reservation so a corrected receipt
can be sent. Paid tickets are never downgraded. Confirmation is visible in My
account; transfer approval currently does not send an email.

Mercado Pago reconciliation skips transfers, and rejected card notifications
cannot overwrite transfer review. An approved card payment still settles the
reservation: review then refuses to approve a transfer for an already-paid
reservation, requiring the organizer to investigate a possible duplicate deposit.

Deployment smoke check: create a reservation, upload an image, verify pending
status, verify another buyer cannot view it, approve from an administrator account,
and verify paid status in My account and the event's registrant list. Also test
rejection followed by corrected submission and a simultaneous card notification.

Rollback: roll back the application first and keep receipt data and assets.
Do not drop the table after receiving transfers: its review audit must be retained.
No automatic bank verification is performed.

Cloudinary references:
- https://cloudinary.com/documentation/image_upload_api_reference
- https://cloudinary.com/documentation/control_access_to_media
- https://cloudinary.com/documentation/authentication_signatures
