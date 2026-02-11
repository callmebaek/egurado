"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Phone, ShieldCheck, MessageSquare, CheckCircle2, ArrowLeft, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"

export const dynamic = 'force-dynamic'

export default function FindIdPage() {
  const { toast } = useToast()
  const { sendOtp, verifyOtp } = useAuth()

  // 전화번호 OTP
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  
  // 결과
  const [maskedEmail, setMaskedEmail] = useState("")
  const [found, setFound] = useState(false)

  // 타이머들
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  useEffect(() => {
    if (otpExpiry <= 0) return
    const timer = setInterval(() => {
      setOtpExpiry(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setOtpSent(false)
          toast({ variant: "destructive", title: "⏰ 인증코드 만료", description: "다시 요청해주세요." })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [otpExpiry])

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  const handleSendOtp = async () => {
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
    if (!cleanPhone.startsWith('010') || cleanPhone.length !== 11) {
      toast({ variant: "destructive", title: "❌ 전화번호 오류", description: "올바른 전화번호를 입력해주세요" })
      return
    }
    setIsSendingOtp(true)
    try {
      await sendOtp(cleanPhone)
      setOtpSent(true)
      setOtpCooldown(60)
      setOtpExpiry(180)
      setOtpCode("")
      toast({ title: "✅ 인증코드 발송", description: "카카오톡으로 인증코드가 발송되었습니다." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 발송 실패", description: error.message || "인증코드 발송에 실패했습니다." })
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ variant: "destructive", title: "❌ 인증코드 오류", description: "6자리 인증코드를 입력해주세요." })
      return
    }
    setIsVerifyingOtp(true)
    try {
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
      const result = await verifyOtp(cleanPhone, otpCode, 'find_id')
      
      if (result.success && result.masked_email) {
        setMaskedEmail(result.masked_email)
        setFound(true)
        toast({ title: "✅ 아이디를 찾았습니다" })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 아이디 찾기 실패", description: error.message || "해당 전화번호로 가입된 계정이 없습니다." })
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50/30 via-green-50/20 to-teal-50/20 p-4">
      <Card className="w-full max-w-md border-2 border-emerald-200/50 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <Image src="/whiplace-logo.svg" alt="WhiPlace" width={180} height={60} priority className="w-full max-w-[180px] h-auto" />
          </div>
          <CardTitle className="text-xl font-bold text-center">아이디 찾기</CardTitle>
          <CardDescription className="text-center">
            회원가입 시 등록한 전화번호로 아이디를 찾을 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {!found ? (
            <>
              {/* 전화번호 입력 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  등록된 전화번호
                </label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="010-1234-5678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    maxLength={13}
                    disabled={isSendingOtp || isVerifyingOtp}
                    className="flex-1 h-12 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || otpCooldown > 0 || phoneNumber.replace(/[^\d]/g, '').length !== 11}
                    className="h-12 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md whitespace-nowrap text-sm"
                  >
                    {isSendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : otpCooldown > 0 ? `${otpCooldown}초` : otpSent ? '재발송' : '인증요청'}
                  </Button>
                </div>
              </div>

              {/* OTP 입력 */}
              {otpSent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      인증코드
                    </label>
                    {otpExpiry > 0 && (
                      <span className={`text-xs font-bold ${otpExpiry <= 30 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="6자리 인증코드 입력"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={isVerifyingOtp}
                    className="h-12 text-base text-center tracking-[0.3em] font-bold border-2 border-emerald-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-yellow-500" />
                    카카오톡으로 발송된 인증코드를 입력해주세요
                  </p>
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpCode.length !== 6 || isVerifyingOtp}
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg"
                  >
                    {isVerifyingOtp ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />확인 중...</>
                    ) : (
                      '아이디 찾기'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* 아이디 찾기 결과 */
            <div className="space-y-6 text-center">
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">회원님의 아이디는</p>
                <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-emerald-200">
                  <Mail className="w-5 h-5 text-emerald-600" />
                  <span className="text-lg font-bold text-gray-800">{maskedEmail}</span>
                </div>
                <p className="text-xs text-gray-500 mt-3">보안을 위해 이메일 일부가 마스킹 처리되어 있습니다</p>
              </div>

              <div className="space-y-3">
                <Link href="/login">
                  <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg">
                    로그인하기
                  </Button>
                </Link>
                <Link href="/find-password">
                  <Button variant="outline" className="w-full h-12 border-2 border-emerald-200 hover:bg-emerald-50 font-bold rounded-xl mt-2">
                    비밀번호 찾기
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* 하단 링크 */}
          <div className="text-center pt-2">
            <Link href="/login" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 hover:underline font-medium">
              <ArrowLeft className="w-4 h-4" />
              로그인으로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
