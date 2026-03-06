# v1.1 New Features
## 1. Add Default to home
- when click on Xeuron logo in App-SideBar (top right), user should be directed to their home landing page, ie https://www.xeuron.com
- Also do a catch all, if pages not found 404, redirect back to https://www.xeuron.com, display a 404 with "pages not found ... redirecting in 3 seconds"

## 2. Add Instrumentation
- We need to track engagement of this application
- Also track the popularity, ranking of subxeuron, publcations, event, etc
- popularity & ranking have 3 time periods
  - last 24 hours
  - last 7 days
  - last 30 days

## 3. Add notification features
- Send user an email whenever someone comment on their post or subxeuron, event or publication, add nicely written verbage on date/time and what a snippet of subxeuron/event/publication with the content of was posted or commented. Add a button in email to visit that unique URL of the post/comment

## 4. Add word tag to facilitate search
- Whenever a new subxeuron, publication or event created, add a searchable tag that can be used in [Search bar](http://localhost:3000/search) in App-SideBar.  
- Please suggest implementation in Supabase that is most efficient to implement search tag. also store search tag in supabase and an attribute/column for the respective subxeuron, event or publication
