'use client';

import { useEffect } from 'react';
import { 
  Vote, 
  Sparkles,
  Users,
  Lightbulb
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface FeatureVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function FeatureVoteModal({
  isOpen,
  onClose,
  onComplete,
}: FeatureVoteModalProps) {
  const router = useRouter();

  // 페이지 포커스 시 투표 완료 여부 체크
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen) {
        const voteCompleted = localStorage.getItem('feature_vote_completed');
        if (voteCompleted === 'true' && onComplete) {
          onComplete();
          onClose();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, onComplete, onClose]);

  const handleGoToVote = () => {
    // 투표 페이지로 이동
    router.push('/dashboard/feature-voting');
    onClose();
  };

  const handleClose = () => {
    // 투표 완료 여부 체크
    const voteCompleted = localStorage.getItem('feature_vote_completed');
    if (voteCompleted === 'true' && onComplete) {
      onComplete();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] md:max-h-[85vh]">
        <DialogHeader className="p-6 pb-4 border-b border-neutral-200">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <Vote className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <DialogTitle className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
              더 나은 서비스를 위한<br />여정에 함께해주세요
            </DialogTitle>
            <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
              여러분의 목소리가 윕플레이스를 만듭니다
            </p>
          </div>
        </DialogHeader>

        <DialogBody className="p-6 space-y-4 overflow-y-auto">
          {/* 메인 메시지 카드 */}
          <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
            <CardContent className="p-4 md:p-5 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm md:text-base font-bold text-primary-600">윕플레이스의 약속</p>
              </div>
              
              <div className="space-y-3">
                <Card className="bg-white border-neutral-200 shadow-sm">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0 mt-2" />
                      <p className="text-xs md:text-sm text-neutral-700 leading-relaxed">
                        <strong className="font-bold text-neutral-900">지속적인 검증과 개선</strong> - 모든 기능을 철저히 검증하고 사용자가 편리하게 이용할 수 있도록 끊임없이 개선합니다
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0 mt-2" />
                      <p className="text-xs md:text-sm text-neutral-700 leading-relaxed">
                        <strong className="font-bold text-neutral-900">새로운 기능 추가</strong> - 안주하지 않고 계속해서 새로운 기능을 개발하여 더 나은 서비스로 발전합니다
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0 mt-2" />
                      <p className="text-xs md:text-sm text-neutral-700 leading-relaxed">
                        <strong className="font-bold text-neutral-900">사용자 중심 개발</strong> - 여러분의 의견이 개발 우선순위를 결정합니다
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* 참여 안내 */}
          <Alert variant="info" className="p-3 md:p-4">
            <Users className="w-4 h-4 text-info-500" />
            <AlertDescription className="text-xs md:text-sm text-neutral-700 leading-relaxed">
              💡 투표를 통해 원하는 기능의 우선순위를 결정하고, 더 빠르게 만나보세요!
            </AlertDescription>
          </Alert>

          {/* 투표 참여 혜택 */}
          <Card className="bg-warning-bg border-warning shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex gap-2">
                <Lightbulb className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm md:text-base font-bold text-neutral-900">
                    참여하면 좋은 점
                  </p>
                  <div className="text-xs md:text-sm text-neutral-600 leading-relaxed space-y-1">
                    <p>• 원하는 기능을 빠르게 사용할 수 있어요</p>
                    <p>• 개발 진행 상황을 실시간으로 확인할 수 있어요</p>
                    <p>• 베타 기능을 가장 먼저 체험할 수 있어요</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogBody>

        <DialogFooter className="p-6 pt-4 border-t border-neutral-200">
          <div className="flex flex-col-reverse sm:flex-row w-full gap-3 sm:justify-end">
            <Button 
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              나중에 하기
            </Button>
            
            <Button
              onClick={handleGoToVote}
              className="w-full sm:w-auto sm:min-w-[200px]"
            >
              개발 중인 리스트 보러가기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
