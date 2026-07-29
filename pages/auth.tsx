import React, { useState } from 'react'
import { useRouter } from 'next/router'

export default function AuthPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const returnTo = typeof router.query.returnTo === 'string' ? router.query.returnTo : '/'

  function submit() {
    if (!token) return alert('请输入令牌')
    // set cookie then redirect
    document.cookie = `game_token=${token}; path=/`
    router.replace(returnTo)
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">访问受限</h1>
      <p className="mb-4">此临时部署受访问令牌保护。请输入你收到的令牌以继续访问。</p>
      <div className="mb-4">
        <input value={token} onChange={e=>setToken(e.target.value)} className="w-full p-2 border rounded" placeholder="在此输入令牌" />
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={submit}>提交并访问</button>
        <button className="px-4 py-2 bg-gray-200 rounded" onClick={()=>{router.replace('/')}}>返回首页</button>
      </div>
      <p className="mt-6 text-sm text-gray-600">若你是部署者，可在环境变量 `ALLOWED_TOKENS` 中设置允许的令牌，多个令牌用英文逗号分隔。</p>
    </div>
  )
}
