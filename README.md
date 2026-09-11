# BOTANIA website (v4)

The current site. Plain HTML, CSS and JavaScript, no framework and no
build step, so any file here can be edited directly and uploaded.

## Files

    index.html .......... Home. Eleven sections, hero to CTA.
    about.html .......... The name, the philosophy, the founder
    build.html .......... "Build Your System", the intake form
    thanks.html ......... Where the form lands after submitting
    privacy.html ........ Privacy
    terms.html .......... Terms of Use

    pt.html ............. The same six pages in Brazilian
    pt-about.html ....... Portuguese. Same structure, same
    pt-build.html ....... anchors, same section ids.
    pt-thanks.html
    pt-privacy.html
    pt-terms.html

    botania.css ......... All styling
    botania.js .......... Canvas engine, calculator, PT table, nav
    _redirects .......... Netlify redirects for retired URLs
    images/ ............. Founder photo (960px, EXIF stripped)

The navigation markup is repeated in the `<header>` of each page. If you
add or rename a page, update it in all twelve.

Home and About carry a second thin bar under the header listing that
page's sections, so a visitor can jump straight to the part they want.
The links are ordinary anchors; the highlighting is handled in
`botania.js`.

## Homepage sections

    hero        the proposition and the primary CTA
    systems     Systems We Build, six capabilities
    demo        the interactive system, three switchable examples
    stages      the four stages
    agents      AI Agents, six roles an agent can hold
    trust       Trust & Safeguards
    tech        Technology & Integrations
    fit         The Right Tool for the Work
    calc        the time calculator
    contact     the closing CTA

Systems We Build sits before the demonstration on purpose: it answers
"what can you build for me" first, and the canvas then shows one of
those assembled.

## The grid, and why it is a subgrid

Every informational section uses one component, `.grid` / `.cell`.

When copy lengths differ, independent columns leave icons, headings and
descriptions starting at different heights, and a section reads as loose
blocks floating near each other. With each cell adopting the parent's
rows (`grid-row: span N; grid-template-rows: subgrid`), every icon in a
row sits on one line, every heading on the next, every description on
the next, whatever the copy does. Browsers without subgrid still get a
clean grid, just without the cross-column baseline.

Row counts differ by variant, so the modifiers are not decorative:
2 rows plain, 3 with `has-icon`, 4 with `has-icon has-note`.
`is-labelled` swaps the heading for a terracotta mono label, used where
the items are categories rather than offerings.

Nothing is hidden behind hover. An earlier version collapsed the stages
and safeguards to icon-and-title with a hover reveal; it was removed
because it hid content that belongs on the page and left those sections
looking nearly empty.

The visual language is applied by meaning, not uniformly:

    botanical icon      a concept, a stage, a principle
    node + connector    something genuinely moves between points
    terracotta mono     section labels and category labels
    whitespace          everything else

Connectors survive in exactly two places below the canvas, both real
sequences: the approval steps (`.flowsteps`) and the calculator, where
three inputs converge into one outcome. `.tech-base` carries a single
hairline because Connectivity genuinely is the layer the categories
above run through. Do not answer "remove the boxes" by adding a dot and
a rule to every item.

## Positioning

BOTANIA sells AI agents, and the site says so plainly. What it avoids is
implying an agent is the answer to everything. The hierarchy is carried
structurally, not just in adjectives:

The demonstration names agents by the job they do (`Response Agent`,
`Reporting Agent`) and keeps plain AI steps, integrations, deterministic
automation and a human decision visibly alongside them. The AI Agents
section lists roles an agent can hold rather than a catalogue of
products. The Right Tool for the Work section states the rule outright:
automation for predictable work, AI for interpretation, agents for
coordination, people for judgment.

When editing copy, keep that order of claims. BOTANIA designs the
connections; agents are one thing that can live inside them.

No technology vendor is named anywhere on the site. That is deliberate:
the implementation stack changes, and naming it invites a partnership
reading the site cannot support.

## Legal pages

`privacy.html` and `terms.html` describe only what the site actually
does. At the time of writing that is Netlify (hosting and Forms),
Google Fonts, and the Google Calendar booking link. There is no
analytics, no advertising, no cookies and nothing written to browser
storage. **If you add any of those, the Privacy page has to change.**

Neither page has been through legal review, and both deliberately avoid
claiming compliance with any specific regime.

## Which page owns what

Each topic lives on exactly one page, so nothing is explained twice.

    Home ............ the proposition, three switchable example
                      systems, the four stages, human approval, how
                      we work, and when an agent is worth building
    About ........... the name, the philosophy, the founder
    Build ........... the intake form and the calendar link

If you add copy, put it on the page that owns that topic rather than
repeating it across pages.

## The time calculator

`#calc` on the homepage. The inputs are ordinary form controls so the
section stays keyboard and screen reader accessible; the drawing between
them is only a connector. Its geometry is measured from the live layout
in `initCalc()` rather than authored, so it follows the fields when they
wrap or stack, and it is redrawn on resize and once the fonts land.

The arithmetic is deliberately plain: people x minutes x times a week,
over `WORK_WEEKS` (46, allowing for leave), with the workweek taken as
`WORK_WEEK` (40) hours. Both constants sit at the top of `initCalc` and
are stated in the note under the widget. Out-of-range input is clamped
rather than rejected, because a silently wrong total is worse than a
nudge. It deliberately does not convert to money or promise a return.

## The system canvases on a phone

Each example system has two layouts, not one layout scaled. The wide
ones (`SPECS.scenarioLead` and friends) are 1200 units across. The
narrow ones (`scenarioLeadMobile` and friends) are 360 units and run
vertically, keeping the branch points as real branches.

`initScenarios` picks between them at 900px and rebuilds when that line
is crossed, because it is a different figure rather than a resized one.
The 900 is above the tablet breakpoint on purpose: the wide layout stops
being readable well before a phone.

Nothing pans any more. The old approach held the canvas at a 660px
minimum and let the reader drag; that rule is gone, and `.pan-hint`
hides itself when the canvas fits, which is now always. `is-vertical` is
set on the svg by the engine so the stylesheet can hold a 440px measure
for the narrow layouts without knowing which spec is mounted.

## The Portuguese pages

The two languages share `botania.css` and `botania.js`. Nothing is
duplicated except the markup.

The diagram labels, the hover text and the three example captions live
in `botania.js` rather than in the HTML, so they are translated at
render time. `PT` holds the table, `tr()` looks a string up, and
`PT_ON` is true when `<html lang>` starts with `pt`. Anything missing
from the table falls through to English, so a half-finished translation
still reads.

Portuguese labels run longer than English ones. `PT_LAYOUT` widens the
node boxes that need it, keeping at least 17px of space to the right of
every label, which is the tightest the English set ever gets. Each
widening fits inside a gap that already existed, so no node had to move.
The closing canvas is the exception: `Crescimento` is wide enough that
its whole row is re-centred and the mobile viewBox widened to 470.

To change Portuguese wording inside a diagram or the calculator, edit
the `PT` table. To change it anywhere else, edit the `pt-*.html` file.

The `pt-*.html` files are written from the English ones, so if you change
English copy that also exists in Portuguese, change both. Each pair is
kept structurally identical: same sections, same ids, same anchors.

Each page links to its counterpart through a plain nav link showing only
the other language: `PT` on English pages, `EN` on Portuguese ones. It
sits with Home and About rather than reading as a control, and it always
lands on the equivalent page, never the homepage. Both are declared in
`hreflang` tags so search engines pair them up.

Note that the site domain in those tags is `botaniaco.com` while the
contact address is `hello@botaniaco.net`. That is intentional as far as
this repo knows, but worth confirming.

## Technical SEO

Metadata only. Nothing in the SEO layer touches visible markup, and the
stylesheet and script are not involved, which is why adding it needed no
cache bump.

    robots.txt     allows everything, points at the sitemap
    sitemap.xml    10 URLs, both languages, hreflang annotated
    <head> layer   canonical, robots, hreflang, Open Graph, JSON-LD

**The production domain is `botaniaco.com`** and it is hard-coded in
three places: every page's canonical and hreflang tags, `sitemap.xml`,
and the `Sitemap:` line in `robots.txt`. If the domain ever changes,
all three have to change together. `botaniaco.net` is a separate
Squarespace page and is not this site, even though the contact address
lives on that domain.

Both `/about` and `/about.html` return 200 on Netlify. The canonical
tags name the `.html` form, which is also what every internal link
uses, so search engines consolidate on one version. Do not add
redirects between the two forms: Netlify already rewrites internally
and a rule there risks a loop.

`thanks.html` and `pt-thanks.html` are `noindex, follow` and are kept
out of the sitemap. They exist only after a form submission. They
deliberately carry no hreflang, because language alternates on a
noindex page send search engines contradictory instructions.

The regeneration script (`gen_pt*.py`) copies the English `<head>`
wholesale, so **regenerating the Portuguese pages will overwrite their
SEO tags with the English ones.** Re-run the SEO script afterwards if
you ever regenerate.

## Cache busting

`botania.css` and `botania.js` are linked with `?v=36` at the end. Browsers
cache these files aggressively, so returning visitors would otherwise keep
seeing the old version after you publish a change.

**Whenever you edit the CSS or JS, bump that number** (to `?v=37`, `?v=38`
and so on) in the `<head>` and `<script>` tag of all eight pages. If you
only change text inside an HTML file you do not need to touch it.

## BOTANIA Co.

The full company name appears in exactly two places: the footer
copyright line and the `author` meta tag. The logo, the wordmark and
every heading stay BOTANIA. It is meant to read as deliberate rather
than as a second brand, so resist putting it anywhere else.

## Code that no longer runs

Roughly a third of `botania.js` is unreachable. It was left in place as the
site was cut down, and none of it does anything, because each piece
looks for an element that no page contains any more.

    the venation engine        12.7 KB   drew the leaf veins behind the
                                         hero canvas, removed on request
    hero canvas specs           2.1 KB   the growing "new lead" diagram,
                                         replaced by the three examples
    initHero()                  1.3 KB
    initTransform()             2.8 KB   the Manual / BOTANIA /
    transform canvas spec       1.2 KB   Intelligent system diagram
    initNamedCanvases()         0.4 KB

About 1.6 KB of CSS is unused for the same reason: `.veins`, `.layers`,
`.layer` and `.problem-list`.

It is all harmless and safe to publish as is. Stripping it would make
the file easier to work in and cut the JavaScript by more than a third.
Every one of these pieces also still exists in `published/botania.js`
and in `_archive/`, so removing it here loses nothing permanently.

## Publishing

Same as before: GitHub → Netlify.

1. https://github.com/daianiof/BotanIA.github.io
2. Add file → Upload files
3. Drag in the changed files, commit
4. Netlify redeploys in a minute or two

Then hard-refresh with Cmd+Shift+R or you will see a cached copy.
Netlify keeps every past deploy, Deploys tab → pick one → Publish deploy
to roll back.

## The contact form

`build.html` and `pt-build.html` use **Netlify Forms**. They work with no
backend, but they only activate once the site is deployed to Netlify,
they will not submit from a local preview.

They are two separate forms, `build-your-system` and
`construa-seu-sistema`, so you can see which language an enquiry came
in through. Submissions appear under **Forms** in the Netlify dashboard.

Netlify scans for forms when it builds, so a form only registers on the
**next deploy after** it is added. If a submission errors, redeploy
before looking for anything else.

Set up an email notification for both under **Project configuration →
Notifications → Emails and webhooks → Form submission notifications**.

## Decisions made without you

These were the open questions from the direction document. Sensible
defaults were used so nothing was blocked, change any of them freely.

- **Testimonials**, removed entirely, as you asked.
- **Contact address**, `hello@botaniaco.com`, on the sidebar of the two
  Build pages. It is the only address on the site.
- **Certifications**, a small two-column list under the founder bio on
  About only, never on the homepage.
- **"Build Your System"**, goes to a short intake form (`build.html`)
  rather than straight to the calendar. The calendar is still there as
  the secondary path in the sidebar.
- **Location**, the founder bio says La Jolla, California. It is not
  stated anywhere else on the site.
- **Client work**, the three example systems are labelled illustrative,
  and nothing implies they are delivered case studies.

## Still to do

- Strip the unreachable JavaScript and CSS described above. Optional,
  the site works exactly the same either way.
