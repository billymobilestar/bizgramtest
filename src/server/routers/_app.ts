import { router } from '@/server/trpc'
import { profileRouter } from './profile'
import { postRouter } from './post'
import { socialRouter } from './social'
import { feedRouter } from './feed'
import { searchRouter } from './search'
import { dmRouter } from './dm'
import { briefRouter } from './brief'
import { moderationRouter } from './moderation'
import { savedRouter } from './saved'
import { commentRouter } from './comment'
import { followRouter } from './follow'
import { messagesRouter } from './messages'
import { publicProcedure, protectedProcedure } from '@/server/trpc'
import { directoryRouter } from './directory'
import { projectsRouter } from './projects'
import { notificationRouter } from './notification'
import { callsheetRouter } from '../../app/projects/callsheet'
import { dashboardRouter } from './dashboard'
import { opinionsRouter } from './opinions'


export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true })), 
  profile: profileRouter,
    dm: dmRouter,
  brief: briefRouter,
  mod: moderationRouter,
  saved: savedRouter,
  comment: commentRouter,
  follow: followRouter,
  messages: messagesRouter,
  directory: directoryRouter,
  projects: projectsRouter,
  notification: notificationRouter,
  callsheet: callsheetRouter,
dashboard: dashboardRouter,
opinions: opinionsRouter,
  post: postRouter,
  social: socialRouter,
  feed: feedRouter,
  search: searchRouter,   // ← must be here
})

export type AppRouter = typeof appRouter  // ← this type is what the React client uses
