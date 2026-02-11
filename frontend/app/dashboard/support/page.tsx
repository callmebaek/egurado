"use client"

/**
 * 고객 지원 페이지
 * FAQ, 1:1 문의하기, 문의 내역, 연락처 정보
 */
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { 
  MessageCircle, 
  HelpCircle,
  Send,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Loader2,
  ExternalLink,
  Book,
  Video,
  FileText
} from 'lucide-react'
import { api } from '@/lib/config'

interface FAQ {
  id: string
  category: string
  question: string
  answer: string
}

interface Ticket {
  id: string
  created_at: string
  type: string
  title: string
  content: string
  status: 'pending' | 'answered' | 'closed'
  answer?: string
  answered_at?: string
}

const FAQ_DATA: FAQ[] = [
  {
    id: '1',
    category: '크레딧',
    question: '크레딧은 어떻게 충전하나요?',
    answer: '상단 헤더의 크레딧 배지를 클릭하면 크레딧 관리 페이지로 이동합니다. 여기서 "크레딧 추가 구매" 버튼을 클릭하여 원하는 패키지를 선택하고 결제하실 수 있습니다.'
  },
  {
    id: '2',
    category: '크레딧',
    question: '월간 크레딧은 언제 리셋되나요?',
    answer: '월간 크레딧은 매월 1일 00시(KST)에 자동으로 리셋됩니다. 사용하지 않은 월간 크레딧은 다음 달로 이월되지 않으니 참고해주세요. 단, 수동으로 충전한 크레딧은 만료 기한이 없습니다.'
  },
  {
    id: '3',
    category: '기능',
    question: '키워드 순위 추적은 어떻게 사용하나요?',
    answer: '좌측 메뉴에서 "키워드 순위 추적"을 선택하고, 매장과 키워드를 등록하면 자동으로 순위를 추적합니다. 순위 변동이 있을 때 알림을 받을 수 있습니다.'
  },
  {
    id: '4',
    category: '기능',
    question: '리뷰 분석 결과는 어디서 확인하나요?',
    answer: '"리뷰 분석" 메뉴에서 분석을 실행하면 긍정/부정 리뷰 분류, 키워드 추출, 감정 분석 결과를 확인할 수 있습니다. 분석 결과는 자동으로 저장되며 언제든지 다시 확인할 수 있습니다.'
  },
  {
    id: '5',
    category: '계정',
    question: '비밀번호를 잊어버렸어요',
    answer: '로그인 페이지에서 "비밀번호 찾기"를 클릭하고 가입 시 사용한 이메일을 입력하면 비밀번호 재설정 링크가 전송됩니다.'
  },
  {
    id: '6',
    category: '계정',
    question: '요금제는 어떻게 변경하나요?',
    answer: '상단 헤더의 Tier 배지를 클릭하면 멤버십 관리 페이지로 이동합니다. 여기서 원하는 요금제를 선택하고 업그레이드 또는 다운그레이드할 수 있습니다.'
  },
  {
    id: '7',
    category: '결제',
    question: '결제 수단은 어떤 것을 사용할 수 있나요?',
    answer: '신용카드, 체크카드, 계좌이체를 지원합니다. 결제는 안전한 PG사를 통해 처리되며 카드 정보는 암호화되어 저장됩니다.'
  },
  {
    id: '8',
    category: '결제',
    question: '환불 정책이 궁금해요',
    answer: '서비스 이용 후 7일 이내, 크레딧을 10% 이하로 사용한 경우에 한해 전액 환불이 가능합니다. 그 외의 경우 부분 환불이 적용될 수 있습니다.'
  },
  {
    id: '9',
    category: '기술',
    question: '크롬 확장 프로그램은 어떻게 설치하나요?',
    answer: 'Chrome 웹 스토어에서 "Whiplace"를 검색하여 설치할 수 있습니다. 설치 후 로그인하면 네이버 플레이스 페이지에서 바로 분석 기능을 사용할 수 있습니다.'
  },
  {
    id: '10',
    category: '기술',
    question: '모바일에서도 사용할 수 있나요?',
    answer: '네, 모든 기능이 모바일 웹에서도 완벽하게 작동합니다. 별도의 앱 설치 없이 브라우저에서 바로 접속하여 사용하실 수 있습니다.'
  },
]

const INQUIRY_TYPES = [
  { value: 'feature', label: '기능 문의' },
  { value: 'bug', label: '버그 신고' },
  { value: 'payment', label: '결제 문의' },
  { value: 'other', label: '기타' },
]

export default function SupportPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  
  // 1:1 문의
  const [inquiryType, setInquiryType] = useState('feature')
  const [inquiryTitle, setInquiryTitle] = useState('')
  const [inquiryContent, setInquiryContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 문의 내역
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoadingTickets, setIsLoadingTickets] = useState(true)

  // FAQ 카테고리 추출
  const categories = ['전체', ...Array.from(new Set(FAQ_DATA.map(faq => faq.category)))]

  // FAQ 필터링
  const filteredFAQs = FAQ_DATA.filter(faq => {
    const matchesCategory = selectedCategory === '전체' || faq.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // 문의 내역 로드
  useEffect(() => {
    const loadTickets = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/support/tickets`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          // 백엔드 응답: { tickets: [], total_count }
          const ticketsList = data.tickets || []
          // 백엔드 필드명을 프론트엔드 형식으로 변환
          const formattedTickets = ticketsList.map((t: any) => ({
            id: t.id,
            created_at: t.created_at,
            type: t.type || 'other',
            title: t.title,
            content: t.content,
            status: t.status,
            answer: t.answer,
            answered_at: t.answered_at
          }))
          setTickets(formattedTickets)
        } else {
          // Mock 데이터 (API 오류 시)
          const mockTickets: Ticket[] = [
            {
              id: '1',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              type: '기능 문의',
              title: '크레딧 차감 오류',
              content: '키워드 추적을 했는데 크레딧이 두 번 차감되었습니다.',
              status: 'answered',
              answer: '확인 결과 시스템 오류로 중복 차감되었습니다. 3 크레딧을 환불해드렸습니다.',
              answered_at: new Date(Date.now() - 43200000).toISOString()
            },
            {
              id: '2',
              created_at: new Date(Date.now() - 259200000).toISOString(),
              type: '버그 신고',
              title: '키워드 추가가 안됩니다',
              content: '키워드 추가 버튼을 눌러도 반응이 없습니다.',
              status: 'pending',
            },
          ]
          setTickets(mockTickets)
        }
      } catch (error) {
        console.error('문의 내역 로드 실패:', error)
      } finally {
        setIsLoadingTickets(false)
      }
    }
    
    loadTickets()
  }, [user, getToken])

  // 문의 제출
  const handleSubmitInquiry = async () => {
    if (!inquiryTitle.trim() || !inquiryContent.trim()) {
      toast({
        variant: "destructive",
        title: "❌ 입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: inquiryType,
          title: inquiryTitle,
          content: inquiryContent
        })
      })
      
      if (response.ok) {
        const newTicket = await response.json()
        
        toast({
          title: "✅ 문의 접수 완료",
          description: "빠른 시일 내에 답변드리겠습니다.",
        })
        
        // 입력 필드 초기화
        setInquiryTitle('')
        setInquiryContent('')
        setInquiryType('feature')
        
        // 새로운 티켓을 목록 맨 앞에 추가
        const formattedTicket = {
          id: newTicket.id,
          created_at: newTicket.created_at,
          type: newTicket.type || 'other',
          title: newTicket.title,
          content: newTicket.content,
          status: newTicket.status,
          answer: newTicket.answer,
          answered_at: newTicket.answered_at
        }
        setTickets([formattedTicket, ...tickets])
      } else {
        throw new Error('문의 접수 실패')
      }
    } catch (error) {
      console.error('문의 제출 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 접수 실패",
        description: "문의 접수에 실패했습니다. 다시 시도해주세요.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'answered':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            답변완료
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-semibold">
            <Clock className="w-4 h-4" />
            대기중
          </span>
        )
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm font-semibold">
            종료
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
            <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            고객 지원
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto">
          궁금한 점이 있으신가요? FAQ를 확인하거나 1:1 문의를 남겨주세요
        </p>
      </header>

      <div className="space-y-6 md:space-y-8">
        {/* 빠른 도움말 카드 */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={(e) => {
                e.preventDefault()
                toast({
                  title: "🚧 준비 중",
                  description: "사용 가이드를 준비하고 있습니다. 조금만 기다려주세요!",
                })
              }}
              className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Book className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-neutral-900 mb-1">
                  사용 가이드
                </h3>
                <p className="text-sm text-neutral-600 mb-2">
                  기능별 상세 튜토리얼
                </p>
                <div className="flex items-center gap-1 text-blue-600 text-sm font-semibold">
                  보러가기
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault()
                toast({
                  title: "🚧 준비 중",
                  description: "동영상 튜토리얼을 준비하고 있습니다. 조금만 기다려주세요!",
                })
              }}
              className="flex items-start gap-4 p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-neutral-900 mb-1">
                  동영상 튜토리얼
                </h3>
                <p className="text-sm text-neutral-600 mb-2">
                  영상으로 쉽게 배우기
                </p>
                <div className="flex items-center gap-1 text-purple-600 text-sm font-semibold">
                  보러가기
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault()
                toast({
                  title: "🚧 준비 중",
                  description: "API 문서를 준비하고 있습니다. 조금만 기다려주세요!",
                })
              }}
              className="flex items-start gap-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-neutral-900 mb-1">
                  API 문서
                </h3>
                <p className="text-sm text-neutral-600 mb-2">
                  개발자를 위한 문서
                </p>
                <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                  보러가기
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-5 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    자주 묻는 질문 (FAQ)
                  </h2>
                  <p className="text-sm text-blue-700 mt-0.5">
                    빠른 답변을 찾아보세요
                  </p>
                </div>
              </div>

              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5 pointer-events-none" />
                <Input
                  placeholder="질문을 검색하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base border-2 border-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            <div className="p-5 md:p-6">
              {/* 카테고리 필터 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-neutral-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* FAQ 목록 */}
              <div className="space-y-3">
                {filteredFAQs.map((faq) => (
                  <div
                    key={faq.id}
                    className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold flex-shrink-0">
                          {faq.category}
                        </span>
                        <span className="text-base font-semibold text-neutral-900">
                          {faq.question}
                        </span>
                      </div>
                      {expandedFAQ === faq.id ? (
                        <ChevronUp className="w-5 h-5 text-neutral-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-neutral-500 flex-shrink-0" />
                      )}
                    </button>
                    
                    {expandedFAQ === faq.id && (
                      <div className="px-4 pb-4 pt-2 bg-blue-50/50 border-t border-blue-100">
                        <p className="text-sm text-neutral-700 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredFAQs.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    검색 결과가 없습니다
                  </h3>
                  <p className="text-sm text-neutral-600">
                    다른 키워드로 검색해보세요.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* 1:1 문의하기 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <Send className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    1:1 문의하기
                  </h2>
                  <p className="text-sm text-orange-700 mt-0.5">
                    FAQ에서 답을 찾지 못하셨나요?
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              <div className="space-y-5">
                {/* 문의 유형 */}
                <div className="space-y-2">
                  <Label htmlFor="inquiryType" className="text-sm font-semibold text-neutral-700">
                    문의 유형
                  </Label>
                  <select
                    id="inquiryType"
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="w-full h-12 px-4 text-base border-2 border-neutral-300 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200"
                  >
                    {INQUIRY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 제목 */}
                <div className="space-y-2">
                  <Label htmlFor="inquiryTitle" className="text-sm font-semibold text-neutral-700">
                    제목
                  </Label>
                  <Input
                    id="inquiryTitle"
                    value={inquiryTitle}
                    onChange={(e) => setInquiryTitle(e.target.value)}
                    placeholder="문의 제목을 입력하세요"
                    className="h-12 text-base"
                  />
                </div>

                {/* 내용 */}
                <div className="space-y-2">
                  <Label htmlFor="inquiryContent" className="text-sm font-semibold text-neutral-700">
                    내용
                  </Label>
                  <Textarea
                    id="inquiryContent"
                    value={inquiryContent}
                    onChange={(e) => setInquiryContent(e.target.value)}
                    placeholder="문의 내용을 상세히 입력해주세요"
                    rows={8}
                    className="text-base resize-none"
                  />
                </div>

                {/* 제출 버튼 */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSubmitInquiry}
                    disabled={isSubmitting}
                    className="h-12 px-8 text-base font-bold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        제출 중...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        문의하기
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* 내 문의 내역 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    내 문의 내역
                  </h2>
                  <p className="text-sm text-purple-700 mt-0.5">
                    최근 문의 내역을 확인하세요
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {isLoadingTickets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-5 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                              {ticket.type}
                            </span>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <h3 className="text-lg font-bold text-neutral-900 mb-1">
                            {ticket.title}
                          </h3>
                          <p className="text-sm text-neutral-600 mb-2">
                            {ticket.content}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatDate(ticket.created_at)}
                          </p>
                        </div>
                      </div>

                      {ticket.answer && (
                        <div className="mt-4 pt-4 border-t-2 border-purple-200">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MessageCircle className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-purple-900 mb-1">
                                고객센터 답변
                              </div>
                              <p className="text-sm text-neutral-700 leading-relaxed">
                                {ticket.answer}
                              </p>
                              {ticket.answered_at && (
                                <p className="text-xs text-neutral-500 mt-2">
                                  {formatDate(ticket.answered_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    문의 내역이 없습니다
                  </h3>
                  <p className="text-sm text-neutral-600">
                    궁금한 점이 있으시면 언제든 문의해주세요.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* 연락처 정보 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                  <Mail className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    연락처 정보
                  </h2>
                  <p className="text-sm text-green-700 mt-0.5">
                    다른 방법으로 문의하기
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 mb-1">
                      이메일
                    </h3>
                    <p className="text-sm text-neutral-600 mb-2">
                      business@whiplace.com
                    </p>
                    <p className="text-xs text-neutral-500">
                      24시간 이내 답변
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 mb-1">
                      카카오톡
                    </h3>
                    <p className="text-sm text-neutral-600 mb-2">
                      @whiplace
                    </p>
                    <p className="text-xs text-neutral-500">
                      평일 09:00-18:00
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 leading-relaxed">
                  <span className="font-semibold">운영 시간:</span> 평일 09:00-18:00 (점심시간 12:00-13:00)
                  <br />
                  주말 및 공휴일은 휴무이며, 순차적으로 답변드립니다.
                </p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
