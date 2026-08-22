import React, { useState } from 'react';
import { UserProfile } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSave: (updated: Partial<UserProfile>) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone);
  const [address, setAddress] = useState(currentUser.address);
  const [birthDate, setBirthDate] = useState(currentUser.birthDate);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      email,
      phone,
      address,
      birthDate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-[#FFFFFF] rounded-[24px] shadow-floating max-w-lg w-full p-6 md:p-8 z-10 animate-in fade-in zoom-in-95 border border-[#eeeeeb] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#eeeeeb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#eeeeeb] text-[#1a1c1b] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Edit Profile</h3>
              <p className="text-xs text-[#625e52]">Update contact details and information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#424844] hover:bg-[#eeeeeb] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
              Home Address
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1a1c1b] uppercase tracking-wider block mb-1.5">
              Date of Birth
            </label>
            <input
              type="text"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full h-11 rounded-full bg-[#f4f4f1] border-0 px-4 text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#5b7a6b] outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-[#c1c8c3] text-xs font-semibold text-[#1a1c1b] hover:bg-[#eeeeeb] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-full bg-[#1a1c1b] hover:bg-[#424844] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
