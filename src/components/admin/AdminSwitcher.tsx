import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Shield, Sparkles, ChevronDown } from 'lucide-react';

interface AdminSwitcherProps {
    currentView: 'user-dashboard' | 'user-trial' | 'admin-dashboard' | 'admin-trial';
    isAdmin: boolean;
}

export default function AdminSwitcher({ currentView, isAdmin }: AdminSwitcherProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    if (!isAdmin) return null;

    const views = [
        { id: 'user-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'user-trial', label: 'Trial Dashboard', icon: Sparkles, path: '/dashboard?trial=true' },
        { id: 'admin-dashboard', label: 'Admin Panel', icon: Shield, path: '/admin' },
        { id: 'admin-trial', label: 'Trial Admin', icon: Shield, path: '/admin?trial=true' },
    ];

    const currentViewData = views.find(v => v.id === currentView) || views[0];

    const handleViewChange = (path: string) => {
        navigate(path);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
            >
                <currentViewData.icon size={18} />
                <span className="text-sm font-medium hidden sm:inline">{currentViewData.label}</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-infinity-dark-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {views.map((view) => {
                            const Icon = view.icon;
                            const isActive = view.id === currentView;

                            return (
                                <button
                                    key={view.id}
                                    onClick={() => handleViewChange(view.path)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${isActive
                                            ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 text-purple-700 dark:text-purple-300'
                                            : 'hover:bg-gray-50 dark:hover:bg-infinity-dark-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="text-sm font-medium">{view.label}</span>
                                    {isActive && (
                                        <div className="ml-auto w-2 h-2 bg-purple-600 rounded-full"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
