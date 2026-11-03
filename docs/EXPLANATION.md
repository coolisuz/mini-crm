# How this system works and what protects your data

_Written for a non-technical reader._

## What it does

Two kinds of people use the system: **managers** and **executors**.

- A **manager** creates construction sites (we call them "objects") and
  creates tasks on each site. A manager assigns each task to one executor,
  reviews finished work, and either accepts it or sends it back with a
  comment.
- An **executor** sees only the sites where they have a task and only the
  tasks assigned to them personally. They move a task through the stages:
  **New → In progress → Under review**, and if sent back, from **Rework → In
  progress** again.

Every status change — who did it, when, from which state to which, and any
comment — is saved automatically in the task's history.

## What an executor cannot do

Even if an executor is clever and sends requests directly to the server,
bypassing the buttons on the screen:

- They cannot see tasks that are not theirs.
- They cannot see sites where they have no task.
- They cannot change another executor's tasks.
- They cannot change a task's status in a way the rules forbid (for example,
  jumping from "New" straight to "Accepted" is impossible).
- They cannot delete or edit any entry in the task history.
- They cannot change who created a task or when.

A manager can do everything an executor cannot — except the two things
nobody can do: nobody (not even a manager) can rewrite history, and nobody
can change a task's status by poking the database directly. The only way to
move a task through its stages is to go through the dedicated server function
that validates the move and writes the history row at the same moment.

## Where these rules live

They live in the database itself, not just in the app. If someone opens the
developer tools in their browser and tries to send raw requests to our
server, every rule above still applies — the database refuses the request
with an error. We tested each one of these scenarios directly against the
server and recorded the error responses. The UI only hides buttons for
convenience; the real guard is one layer deeper.

## What keys are safe to see

The app ships with a public key, which is designed for browser code. It
grants no permissions by itself — a user still has to log in, and all the
rules above apply to their session. The secret admin key never leaves the
server and is not stored in this repository.

## Signup

New users cannot register themselves. All accounts are created manually by
an administrator in the Supabase dashboard, and the admin assigns the role
(manager or executor).
