import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import {
  Layout,
  Input,
  Space,
  Modal,
  message,
} from 'antd'
import type { InputRef } from 'antd'
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons'
import { nanoid } from 'nanoid'
import askPic from '../public/ask.png'
import replyPic from '../public/reply.svg'
import messagePic from '../public/message.svg'

type IConversation = {
  id: string
  ask: string
  reply: string
}
type ChatItem = {
  key: string
  label?: string
  conversations: IConversation[]
}

const { Sider, Content } = Layout
import styles from './chat.module.css'

export default function Chat() {
  const [currentChat, setCurrentChat] = useState<ChatItem>({
    key: nanoid(),
    conversations: []
  })
  const [labelEditing, setLabelEditing] = useState(false)
  const [chatItems, setChatItems] = useState<ChatItem[]>([])
  const inputRef = useRef<InputRef>(null)
  const textAreaRef = useRef<InputRef>(null)
  const [prompt, setPrompt] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [currentConvsersationId, setCurrentConvsersationId] = useState<string>('')
  const [token, setToken] = useState('')
  const [tokenModalOpen, setTokenModalOpen] = useState(false)

  // 从本地取 token 和存储对话
  useEffect(() => {
    if (!window.localStorage.getItem('token')) {
      setTokenModalOpen(true)
    }
    const chatCached = window.localStorage.getItem('chat-cached')
    if (chatCached) {
      setChatItems(JSON.parse(chatCached))
    }
  }, [])

  useEffect(() => {
    serialize()
  }, [chatItems])

  const serialize = () => {
    window.localStorage.setItem('chat-cached', JSON.stringify(chatItems))
  }

  const syncChatInChatItems = (chat: ChatItem) => {
    const index = chatItems.findIndex(item => item.key === chat?.key)
    if (index !== -1) {
      chatItems.splice(index, 1, chat)
      setChatItems([...chatItems])
    } else {
      setChatItems([chat])
    }
  }

  const handleNewChat = () => {
    debugger
    setCurrentChat({
      key: nanoid(),
      conversations: []
    })
  }
  const handleLabelEditOk = () => {
    syncChatInChatItems(currentChat)
    handleLabelEditCancel()
  }
  const handleLabelEditCancel = () => {
    setLabelEditing(false)
  }

  const handlChatDel = (item: ChatItem) => {
    const index = chatItems.findIndex(source => source.key === item.key)

    if (index !== -1) {
      chatItems.splice(index, 1)
      setChatItems([...chatItems])
    }
    if (item.key === currentChat.key) {
      handleNewChat()
    }
  }
  const handleEditTrigger = (state: boolean) => {
    setLabelEditing(true)
    setTimeout(() => {
      inputRef.current?.focus({
        cursor: 'end',
      })
    }, 0)
  }
  const handleLableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentChat) {
      setCurrentChat({
        ...currentChat,
        label: e.target.value
      })
    }
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
  }
  const handleSend = () => {
    if (waiting) {
      message.warning('正在等待上一问题回复...')
      return
    }
    if (prompt) {
      textAreaRef.current?.blur()
      setPrompt('')
      setWaiting(true)
      const convsersationId = nanoid()
      setCurrentConvsersationId(convsersationId)
      const conversation = {
        id: convsersationId,
        ask: prompt,
        reply: ''
      }
      const conversations = [...currentChat.conversations]
      conversations.push(conversation)
      if (!currentChat.label) { // 选第一问题的问做为标题
        currentChat.label = prompt.slice(0, 15)
      }
      setCurrentChat({ // 更新当前对话
        ...currentChat,
        conversations
      })
      sendMessage(prompt).then((res) => {
        if (res.code !== 200) {
          message.error(res?.error?.message)
          // 删掉错误对话
          const index = conversations.findIndex(item => item.id === convsersationId)
          if (index !== -1) {
            conversations.splice(index, 1)
            // 刷新视图
            setCurrentChat({
              ...currentChat,
              conversations
            })
          }
          if (res.code === 401) {
            setTokenModalOpen(true)
          }
        } else {
          const index = conversations.findIndex(item => item.id === convsersationId)
          if (index !== -1) {
            conversations.splice(index, 1, {
              ...conversations[index],
              reply: res?.result
            })
          }
          // 刷新视图
          const newCurrentChat = {
            ...currentChat,
            conversations
          }
          setCurrentChat(newCurrentChat)
          // 会话成功，同步至对话列表
          syncChatInChatItems(newCurrentChat)
        }
      }).catch(() => {
        message.error('请求错误')
      }).finally(() => {
        setWaiting(false)
      })
    }
  }

  const sendMessage = (prompt: string): Promise<{
    code: number
    result: string
    error?: {
      message: string
    }
  }> => {
    return fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: window.localStorage.getItem('token') || '',
        prompt
      })
    }).then((res) => res.json())
  }

  const handleTokenValidate = () => {
    fetch('/api/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token
      })
    }).then((res) => res.json())
      .then(res => {
        if (res.code === 200) {
          message.success('通过')
          window.localStorage.setItem('token', token)
          setTokenModalOpen(false)
        } else {
          message.error(res?.error?.message)
        }
      })
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={260} style={{ background: '#202123' }}>
        <div className={styles.nav}>
          <div className={styles.newBtn} onClick={handleNewChat}>
            + New Chat
          </div>
          <div className={styles.chatList}>
            {chatItems.map(item => (
              <div className={styles.chatItemActionWrap} key={item.key}>
                <div
                  className={`${styles.chatItem} ${currentChat.key === item.key ? styles.chatItemSelected : ''}`}
                  onClick={() => setCurrentChat(item)}
                >
                  <span className={styles.icon}>
                    <Image
                      src={messagePic}
                      alt="message"
                      width={16}
                      height={16}
                    />
                  </span>
                  <span className={styles.labelWrap}>
                    {currentChat.key === item.key && labelEditing ? (
                      <Input
                        ref={inputRef}
                        value={currentChat?.label}
                        onChange={handleLableChange}
                        style={{
                          height: 20,
                          background: 'transparent',
                          color: '#fff',
                          width: 160
                        }}
                      />
                    ) : item?.label}
                  </span>
                </div>
                {currentChat.key === item.key && (
                  labelEditing ? (
                    <Space className={styles.actionWrap}>
                      <CheckOutlined onClick={handleLabelEditOk} />
                      <CloseOutlined onClick={handleLabelEditCancel} />
                    </Space>
                  ) : (
                    <Space className={styles.actionWrap}>
                      <EditOutlined onClick={() => handleEditTrigger(true)} />
                      <DeleteOutlined onClick={() => handlChatDel(item)} />
                    </Space>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </Sider>
      <Content style={{ height: '100%', overflowY: 'scroll' }}>
        <div className={styles.contentWrap}>
          {!(currentChat.conversations?.length > 0) && (
            <div className={styles.headTitle}>ChatGPT</div>
          )}
          {currentChat.conversations?.map(conversation => (
            <div className={styles.converation} key={conversation.id}>
              <div className={styles.itemWrap} style={{ background: '#fff' }}>
                <div className={styles.item}>
                  <Image
                    src={askPic}
                    alt="问题"
                    width={30}
                    height={30}
                  />
                  <div className={styles.content}>{conversation.ask}</div>
                </div>
              </div>
              <div className={styles.itemWrap}>
                <div className={styles.item}>
                  <Image
                    src={replyPic}
                    alt="回答"
                    width={30}
                    height={30}
                  />
                  <div className={styles.content}>
                    {waiting && conversation.id === currentConvsersationId ? '等待应答...' : conversation.reply}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className={styles.bottomInput}>
            <Input.TextArea
              style={{ width: 768, marginRight: 5 }}
              autoSize
              ref={textAreaRef}
              value={prompt}
              onChange={handlePromptChange}
              onPressEnter={handleSend}
            />
            <SendOutlined onClick={handleSend} />
          </div>
        </div>
      </Content>
      <Modal
        centered
        open={tokenModalOpen}
        footer={null}
        maskClosable={false}
        closable={false}
      >
        <Input
          placeholder="输入token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onPressEnter={handleTokenValidate}
        />
      </Modal>
    </Layout>
  )
}
