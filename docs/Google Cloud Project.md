# Google Cloud Project Setup

  - Go to https://console.cloud.google.com/ and create a new project
- Enable **Google Sheets API** at https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=YOUR_PROJECT_ID
- Go to **APIs & Services** → **OAuth consent screen**, choose **External**, fill in app name and emails, save
- Go to **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
- Choose **Web application**, add authorized JavaScript origins (e.g. `http://127.0.0.1:5500`, `https://YOUR_USERNAME.github.io`)
- Copy the **Client ID** (not the secret) and paste it into `config.js` as `GOOGLE_CLIENT_ID`
- Go to **APIs & Services** → **Audience**, add test users or publish the app to make it production-ready
- Add your spreadsheet ID to `config.js` as `SPREADSHEET_ID` (found in the Google Sheets URL between `/d/` and `/edit`)

## Google Sheets setup

Create a spreadsheet with the following sheets (exact names, case-sensitive):

| Sheet name | Columns (in order) |
|---|---|
| `Users` | Id, DisplayName, BackgroundColor, ForegroundColor, Emails |
| `Expenses` | Id, DateCreatedUtc, AmountEuros, CreatedBy, Note, BalanceId, SplitWith |
| `Payments` | Id, DateCreatedUtc, FromUserId, ToUserId, AmountEuros, Note |
| `Balances` | Id, DateCreatedUtc |
| `Settlements` | Id, BalanceId, FromUserId, ToUserId, AmountEuros |

Row 1 of each sheet must be the header row with those exact column names. Data starts from row 2.

### Users sheet notes

- `BackgroundColor` and `ForegroundColor` must be valid CSS hex colors (e.g. `#0d6efd`, `#ffffff`)
- `Emails` is a comma-separated list of Google account emails for that user
- Users are read-only from the UI — add/edit them directly in the spreadsheet
