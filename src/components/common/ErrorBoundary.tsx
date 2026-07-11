import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sakura-50 via-peach-50 to-lilac-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl shadow-sakura-200/30 p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">😢</div>
            <h1 className="text-xl font-bold text-cloud-800 mb-2" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              出了点小问题
            </h1>
            <p className="text-sm text-cloud-500 mb-4">
              页面加载时遇到了一些错误，请尝试刷新页面
            </p>
            {this.state.error && (
              <div className="text-left bg-red-50 rounded-xl p-3 mb-4 text-xs text-red-500 font-mono overflow-auto max-h-40">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
