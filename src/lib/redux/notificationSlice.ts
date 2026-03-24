import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface NotificationState {
  unreadCount: number
}

const initialState: NotificationState = {
  unreadCount: 0,
}

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload
    },
    incrementUnread: (state) => {
      state.unreadCount += 1
    },
    decrementUnread: (state) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1)
    },
  },
})

export const { setUnreadCount, incrementUnread, decrementUnread } = notificationSlice.actions
export default notificationSlice.reducer
