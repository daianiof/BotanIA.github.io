# BOTANIA website (v4)

The current site. Plain HTML, CSS and JavaScript, no framework and no
build step, so any file here can be edited directly and uploaded.

## Files

    index.html .......... Home. The whole offer on one page.
    about.html .......... The name, the philosophy, the founder
    build.html .......... "Build Your System", the intake form
    thanks.html ......... Where the form lands after submitting
    botania.css ......... All styling
    botania.js .......... The system canvas engine + venation + nav
    _redirects .......... Netlify redirects for retired URLs
    images/ ............. Founder photo (960px, EXIF stripped)

The navigation markup is repeated in the `<header>` of each page. If you
add or rename a page, update it in all four.

Home and About carry a second thin bar under the header listing that
page's sections, so a visitor can jump straight to the part they want.
The links are ordinary anchors; the highlighting is handled in
`botania.js`.

## Which page owns what

Each topic lives on exactly one page, so nothing is explained twice.

    Home ............ the proposition, three switchable example
                      systems, the four stages, human approval, how
                      we work, and when an agent is worth building
    About ........... the name, the philosophy, the founder
    Build ........... the intake form and the calendar link

If you add copy, put it on the page that owns that topic rather than
repeating it across pages.

## Cache busting

`botania.css` and `botania.js` are linked with `?v=34` at the end. Browsers
cache these files aggressively, so returning visitors would otherwise keep
seeing the old version after you publish a change.

**Whenever you edit the CSS or JS, bump that number** (to `?v=35`, `?v=36`
and so on) in the `<head>` and `<script>` tag of all four pages. If you
only change text inside an HTML file you do not need to touch it.

## Code that no longer runs

Roughly 38% of `botania.js` is unreachable. It was left in place as the
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

`build.html` uses **Netlify Forms**. It works with no backend, but it
only activates once the site is deployed to Netlify, it will not submit
from a local preview. Submissions appear under **Forms** in the Netlify
dashboard. Set up an email notification there so they reach your inbox.

## Decisions made without you

These were the open questions from the direction document. Sensible
defaults were used so nothing was blocked, change any of them freely.

- **Testimonials**, removed entirely, as you asked.
- **Contact address**, `abotania.co@gmail.com`, carried over from the
  previous site. No address was invented.
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

- Portuguese pages (`pt.html`, `pt-about.html`, `pt-build.html`), plus a `PT` link in the nav and
  `hreflang` tags. The `_redirects` entries for `/pt*` are temporary and
  should be removed when those ship.
- A contact address on the botaniaco.com domain. Every page currently
  uses `abotania.co@gmail.com`, carried over from the previous site.
